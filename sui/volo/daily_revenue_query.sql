-- Daily Revenue Calculation for Volo V2 Protocol
-- Combines fee_amount from poolInteractionsV2 and reward_fee from epochChangedV2

WITH daily_transaction_fees AS (
  SELECT 
    DATE(timestamp) as date,
    SUM(CAST(JSON_EXTRACT(data, '$.fee_amount') AS DECIMAL(20,9))) as transaction_fees
  FROM event_logs
  WHERE 
    name = 'poolInteractionsV2'
    AND JSON_EXTRACT(data, '$.version') = 'v2'
    AND JSON_EXTRACT(data, '$.env') = 'mainnet'
    AND JSON_EXTRACT(data, '$.fee_amount') IS NOT NULL
    AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) -- Last 30 days
  GROUP BY DATE(timestamp)
),
daily_reward_fees AS (
  SELECT 
    DATE(timestamp) as date,
    SUM(CAST(JSON_EXTRACT(data, '$.reward_fee') AS DECIMAL(20,9))) as reward_fees
  FROM event_logs
  WHERE 
    name = 'epochChangedV2'
    AND JSON_EXTRACT(data, '$.version') = 'v2'
    AND JSON_EXTRACT(data, '$.env') = 'mainnet'
    AND JSON_EXTRACT(data, '$.reward_fee') IS NOT NULL
    AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) -- Last 30 days
  GROUP BY DATE(timestamp)
),
all_dates AS (
  SELECT date FROM daily_transaction_fees
  UNION
  SELECT date FROM daily_reward_fees
)
SELECT 
  d.date,
  COALESCE(tf.transaction_fees, 0) as transaction_fees,
  COALESCE(rf.reward_fees, 0) as reward_fees,
  COALESCE(tf.transaction_fees, 0) + COALESCE(rf.reward_fees, 0) as total_daily_revenue
FROM all_dates d
LEFT JOIN daily_transaction_fees tf ON d.date = tf.date
LEFT JOIN daily_reward_fees rf ON d.date = rf.date
ORDER BY d.date DESC;

-- Alternative simpler version using UNION ALL approach
-- This version treats all fees as a single revenue stream

WITH daily_fees AS (
  -- Transaction fees from stake/unstake operations
  SELECT 
    DATE(timestamp) as date,
    CAST(JSON_EXTRACT(data, '$.fee_amount') AS DECIMAL(20,9)) as fee_amount,
    'transaction_fee' as fee_type
  FROM event_logs
  WHERE 
    name = 'poolInteractionsV2'
    AND JSON_EXTRACT(data, '$.version') = 'v2'
    AND JSON_EXTRACT(data, '$.env') = 'mainnet'
    AND JSON_EXTRACT(data, '$.fee_amount') IS NOT NULL
    AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    
  UNION ALL
  
  -- Reward fees from epoch changes
  SELECT 
    DATE(timestamp) as date,
    CAST(JSON_EXTRACT(data, '$.reward_fee') AS DECIMAL(20,9)) as fee_amount,
    'reward_fee' as fee_type
  FROM event_logs
  WHERE 
    name = 'epochChangedV2'
    AND JSON_EXTRACT(data, '$.version') = 'v2'
    AND JSON_EXTRACT(data, '$.env') = 'mainnet'
    AND JSON_EXTRACT(data, '$.reward_fee') IS NOT NULL
    AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
)
SELECT 
  date,
  SUM(CASE WHEN fee_type = 'transaction_fee' THEN fee_amount ELSE 0 END) as transaction_fees,
  SUM(CASE WHEN fee_type = 'reward_fee' THEN fee_amount ELSE 0 END) as reward_fees,
  SUM(fee_amount) as total_daily_revenue,
  COUNT(CASE WHEN fee_type = 'transaction_fee' THEN 1 END) as transaction_count,
  COUNT(CASE WHEN fee_type = 'reward_fee' THEN 1 END) as epoch_count
FROM daily_fees
GROUP BY date
ORDER BY date DESC;

-- Weekly aggregation for longer-term analysis
WITH weekly_fees AS (
  SELECT 
    DATE_SUB(DATE(timestamp), INTERVAL WEEKDAY(timestamp) DAY) as week_start,
    CAST(JSON_EXTRACT(data, '$.fee_amount') AS DECIMAL(20,9)) as fee_amount,
    'transaction_fee' as fee_type
  FROM event_logs
  WHERE 
    name = 'poolInteractionsV2'
    AND JSON_EXTRACT(data, '$.version') = 'v2'
    AND JSON_EXTRACT(data, '$.env') = 'mainnet'
    AND JSON_EXTRACT(data, '$.fee_amount') IS NOT NULL
    AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    
  UNION ALL
  
  SELECT 
    DATE_SUB(DATE(timestamp), INTERVAL WEEKDAY(timestamp) DAY) as week_start,
    CAST(JSON_EXTRACT(data, '$.reward_fee') AS DECIMAL(20,9)) as fee_amount,
    'reward_fee' as fee_type
  FROM event_logs
  WHERE 
    name = 'epochChangedV2'
    AND JSON_EXTRACT(data, '$.version') = 'v2'
    AND JSON_EXTRACT(data, '$.env') = 'mainnet'
    AND JSON_EXTRACT(data, '$.reward_fee') IS NOT NULL
    AND timestamp >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
)
SELECT 
  week_start,
  DATE_ADD(week_start, INTERVAL 6 DAY) as week_end,
  SUM(CASE WHEN fee_type = 'transaction_fee' THEN fee_amount ELSE 0 END) as weekly_transaction_fees,
  SUM(CASE WHEN fee_type = 'reward_fee' THEN fee_amount ELSE 0 END) as weekly_reward_fees,
  SUM(fee_amount) as total_weekly_revenue
FROM weekly_fees
GROUP BY week_start
ORDER BY week_start DESC; 