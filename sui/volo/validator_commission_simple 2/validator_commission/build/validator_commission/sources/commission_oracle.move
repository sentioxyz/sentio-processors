module validator_commission::commission_oracle;

use sui::object::{Self, UID};
use sui::transfer;
use sui::tx_context::{Self, TxContext};
use sui::event;

// ================= 错误代码 =================

const EInvalidCommission: u64 = 1;
const EUnauthorized: u64 = 2;
const EInvalidTimestamp: u64 = 3;

// ================= 事件 =================

/// 委托费用更新事件
public struct CommissionUpdated {
    validator_address: address,
    old_commission: u64,
    new_commission: u64,
    timestamp: u64,
    epoch: u64,
} has copy, drop;

/// Oracle 创建事件
public struct OracleCreated {
    oracle_id: address,
    owner: address,
    validator_address: address,
} has copy, drop;

// ================= 结构体 =================

/// 委托费用 Oracle
public struct CommissionOracle has key {
    id: UID,
    /// 验证者地址
    validator_address: address,
    /// 当前委托费用 (SUI, 精度为 9 位小数)
    current_commission: u64,
    /// 上次更新时间戳 (毫秒)
    last_update_timestamp: u64,
    /// 上次更新的 epoch
    last_update_epoch: u64,
    /// 历史记录数量
    update_count: u64,
}

/// Owner 权限
public struct OwnerCap has key, store {
    id: UID,
    oracle_id: address,
}

// ================= 公共函数 =================

/// 创建新的 Commission Oracle
public fun create_oracle(
    validator_address: address,
    initial_commission: u64,
    ctx: &mut TxContext
) {
    let oracle_id = object::new(ctx);
    let oracle_address = object::uid_to_address(&oracle_id);
    
    let oracle = CommissionOracle {
        id: oracle_id,
        validator_address,
        current_commission: initial_commission,
        last_update_timestamp: 0,
        last_update_epoch: tx_context::epoch(ctx),
        update_count: 0,
    };
    
    let owner_cap = OwnerCap {
        id: object::new(ctx),
        oracle_id: oracle_address,
    };
    
    event::emit(OracleCreated {
        oracle_id: oracle_address,
        owner: tx_context::sender(ctx),
        validator_address,
    });
    
    transfer::share_object(oracle);
    transfer::transfer(owner_cap, tx_context::sender(ctx));
}

/// 更新委托费用
public fun update_commission(
    oracle: &mut CommissionOracle,
    _owner_cap: &OwnerCap,
    new_commission: u64,
    timestamp: u64,
    ctx: &mut TxContext
) {
    // 验证权限
    assert!(_owner_cap.oracle_id == object::uid_to_address(&oracle.id), EUnauthorized);
    
    // 验证时间戳
    assert!(timestamp > oracle.last_update_timestamp, EInvalidTimestamp);
    
    // 先保存旧值并发射事件，然后再更新
    let old_commission = oracle.current_commission;
    let current_epoch = tx_context::epoch(ctx);
    
    // 先发射事件（使用旧值）
    event::emit(CommissionUpdated {
        validator_address: oracle.validator_address,
        old_commission,
        new_commission,
        timestamp,
        epoch: current_epoch,
    });
    
    // 然后更新Oracle状态
    oracle.current_commission = new_commission;
    oracle.last_update_timestamp = timestamp;
    oracle.last_update_epoch = current_epoch;
    oracle.update_count = oracle.update_count + 1;
}

// ================= 查询函数 =================

/// 获取当前委托费用
public fun get_current_commission(oracle: &CommissionOracle): u64 {
    oracle.current_commission
}

/// 获取验证者地址
public fun get_validator_address(oracle: &CommissionOracle): address {
    oracle.validator_address
}

/// 获取最后更新时间戳
public fun get_last_update_timestamp(oracle: &CommissionOracle): u64 {
    oracle.last_update_timestamp
}

/// 获取最后更新 epoch
public fun get_last_update_epoch(oracle: &CommissionOracle): u64 {
    oracle.last_update_epoch
}

/// 获取更新次数
public fun get_update_count(oracle: &CommissionOracle): u64 {
    oracle.update_count
}

/// 获取 Oracle ID
public fun get_oracle_id(oracle: &CommissionOracle): address {
    object::uid_to_address(&oracle.id)
}

/// 检查 OwnerCap 是否匹配
public fun check_owner_cap(oracle: &CommissionOracle, owner_cap: &OwnerCap): bool {
    owner_cap.oracle_id == object::uid_to_address(&oracle.id)
}

// ================= 辅助函数 =================

/// 将 SUI 数量转换为带小数的字符串表示（仅用于显示）
public fun format_commission_sui(commission: u64): vector<u8> {
    // 简化版本，实际使用时可能需要更复杂的格式化
    let _whole_part = commission / 1_000_000_000;
    let _decimal_part = commission % 1_000_000_000;
    
    // 这里返回一个简单的字节表示
    // 实际实现中可能需要更复杂的字符串格式化
    b"commission_value"
}

#[test_only]
public fun init_for_testing(ctx: &mut TxContext) {
    // 测试用的初始化函数
}

// ================= 测试 =================

#[test_only]
use sui::test_scenario;

#[test]
fun test_create_and_update_oracle() {
    let admin = @0xA;
    let validator_addr = @0xB;
    
    let mut scenario = test_scenario::begin(admin);
    {
        create_oracle(validator_addr, 1000000000, test_scenario::ctx(&mut scenario)); // 1 SUI
    };
    
    test_scenario::next_tx(&mut scenario, admin);
    {
        let mut oracle = test_scenario::take_shared<CommissionOracle>(&scenario);
        let owner_cap = test_scenario::take_from_sender<OwnerCap>(&scenario);
        
        assert!(get_current_commission(&oracle) == 1000000000, 0);
        assert!(get_validator_address(&oracle) == validator_addr, 1);
        
        update_commission(&mut oracle, &owner_cap, 2000000000, 1000, test_scenario::ctx(&mut scenario));
        
        assert!(get_current_commission(&oracle) == 2000000000, 2);
        assert!(get_update_count(&oracle) == 1, 3);
        
        test_scenario::return_shared(oracle);
        test_scenario::return_to_sender(&scenario, owner_cap);
    };
    
    test_scenario::end(scenario);
}
