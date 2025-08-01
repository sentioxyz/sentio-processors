// SPDX-License-Identifier: MIT
#[allow(duplicate_alias, unused)]
module liquid_staking::unstake_ticket {
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};

    /* friend liquid_staking::native_pool; */

    const VERSION: u64 = 2;

    /* Events */

    public struct TicketMintedEvent has copy, drop {
        id: ID,
        value: u64, 
        unlock_epoch: u64,
        unstake_fee: u64,
    }

    public struct TicketBurnedEvent has copy, drop {
        id: ID,
        value: u64,
        epoch: u64,
        unstake_fee: u64,
    }

    /* Objects */

    // Special ticket gives ability to make unstake of principal after timestamp
    public struct UnstakeTicket has key {
        id: UID,
        unlock_epoch: u64, // epoch where ticket can burn
        value: u64, // value of SUI that should be paid for ticket
        unstake_fee: u64, // fee that we collect while burn
    }
    
    // Liquid staking pool object
    public struct Metadata has key, store {
        id: UID,
        version: u64,
        total_supply: u64,
        max_history_value: Table<u64, u64>, // epoch => sum of tickets
    }

    // created once
    public(package) fun create_metadata(ctx: &mut TxContext): Metadata {
        Metadata {
            id: object::new(ctx),
            total_supply: 0,
            version: VERSION,
            max_history_value: table::new<u64, u64>(ctx),
        }
    }

    /* Read methods */

    public fun get_total_supply(metadata: &Metadata): u64 {
        metadata.total_supply
    }

    // return true if ticket is unlocked
    public fun is_unlocked(ticket: &UnstakeTicket, ctx: &TxContext): bool {
        tx_context::epoch(ctx) >= ticket.unlock_epoch
    }

    public fun get_value(ticket: &UnstakeTicket): u64 {
        ticket.value
    }

    public fun get_unstake_fee(ticket: &UnstakeTicket): u64 {
        ticket.unstake_fee
    }

    public fun get_unlock_epoch(ticket: &UnstakeTicket): u64 {
        ticket.unlock_epoch
    }

    public(package) fun get_max_supply_for_2epochs(self: &Metadata, ctx: &mut TxContext): u64 {
        let current_epoch = tx_context::epoch(ctx);
        let mut total = 0;

        if (table::contains(&self.max_history_value, current_epoch)) {
            total = *table::borrow(&self.max_history_value, current_epoch);
        };

        if (current_epoch > 0 && table::contains(&self.max_history_value, current_epoch - 1)) {
            total = total + *table::borrow(&self.max_history_value, current_epoch - 1);
        };

        total
    }

    /* Ticket logic */

    // add unstake amount to epoch
    fun add_to_epoch(self: &mut Metadata, value: u64, ctx: &mut TxContext) {
        let epoch = tx_context::epoch(ctx);

        if (table::contains(&self.max_history_value, epoch)) {
            let total = table::borrow_mut(&mut self.max_history_value, epoch);
            *total = *total + value;
        } else {
            table::add(&mut self.max_history_value, epoch, value);
        }
    }

    // create unstake ticket
    public(package) fun wrap_unstake_ticket(metadata: &mut Metadata, value: u64, unstake_fee: u64, unlocked_in_epoch: u64, ctx: &mut TxContext): UnstakeTicket {
        add_to_epoch(metadata, value, ctx);

        metadata.total_supply = metadata.total_supply + value;

        let ticket = UnstakeTicket {
            id: object::new(ctx),
            value,
            unlock_epoch: unlocked_in_epoch,
            unstake_fee,
        };
        event::emit(TicketMintedEvent {
            id: object::uid_to_inner(&ticket.id),
            value: ticket.value,
            unlock_epoch: ticket.unlock_epoch,
            unstake_fee: ticket.unstake_fee,
        });
        ticket
    }

    #[test_only]
    public fun wrap_unstake_ticket_for_testing(metadata: &mut Metadata, value: u64, unstake_fee: u64, unlocked_in_epoch: u64, ctx: &mut TxContext): UnstakeTicket {
        wrap_unstake_ticket(metadata, value, unstake_fee, unlocked_in_epoch, ctx)
    }

    // destroy ticket
    public(package) fun unwrap_unstake_ticket(metadata: &mut Metadata, ticket: UnstakeTicket, ctx: &TxContext): (u64, u64) {
        let UnstakeTicket {
            id,
            unlock_epoch: _,
            value,
            unstake_fee,
        } = ticket;

        metadata.total_supply = metadata.total_supply - value;

        event::emit(TicketBurnedEvent {
            id: object::uid_to_inner(&id),
            value,
            epoch: tx_context::epoch(ctx),
            unstake_fee,
        });

        object::delete(id);
        (value, unstake_fee)
    }

    #[test_only]
    public fun unwrap_unstake_ticket_for_testing(metadata: &mut Metadata, ticket: UnstakeTicket, ctx: &TxContext): (u64, u64) {
        unwrap_unstake_ticket(metadata, ticket, ctx)
    }

    public(package) fun transfer(ticket: UnstakeTicket, to: address) {
        transfer::transfer(ticket, to)
    }

    #[test_only]
    public fun transfer_for_testing(ticket: UnstakeTicket, to: address) {
        transfer(ticket, to)
    }

    #[test_only]
    public fun test_create(ctx: &mut TxContext): Metadata {
        create_metadata(ctx)
    }
}