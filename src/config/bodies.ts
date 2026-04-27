

export const CREEP_CONFIGS: Record<string, RoleBodyConfig> = {
    defender: {
        vanguard: [TOUGH, TOUGH, MOVE, MOVE, ATTACK, MOVE],
        sentinel: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK],
        bastion: Array(5).fill(TOUGH).concat(Array(8).fill(MOVE)).concat(Array(5).fill(ATTACK)),
        citadel: Array(8).fill(TOUGH).concat(Array(12).fill(MOVE)).concat(Array(8).fill(ATTACK)),
        apex: Array(10).fill(TOUGH).concat(Array(15).fill(MOVE)).concat(Array(10).fill(ATTACK))
    },
    miner: {
        vanguard: [WORK, WORK, CARRY, MOVE],
        sentinel: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
        bastion: Array(6).fill(WORK).concat([CARRY]).concat(Array(3).fill(MOVE)),
        citadel: Array(7).fill(WORK).concat([CARRY]).concat(Array(4).fill(MOVE)),
        apex: Array(8).fill(WORK).concat([CARRY]).concat(Array(5).fill(MOVE))
    },
    dismantleMiner: {
        vanguard: [WORK, WORK, CARRY, MOVE],
        sentinel: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
        bastion: Array(8).fill(WORK).concat([CARRY]).concat(Array(3).fill(MOVE)),
        citadel: Array(12).fill(WORK).concat([CARRY]).concat(Array(5).fill(MOVE)),
        apex: Array(14).fill(WORK).concat([CARRY]).concat(Array(7).fill(MOVE))
    },
    extractorMiner: {
        vanguard: [WORK, WORK, CARRY, MOVE],
        sentinel: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
        bastion: Array(6).fill(WORK).concat([CARRY]).concat(Array(3).fill(MOVE)),
        citadel: Array(8).fill(WORK).concat([CARRY]).concat(Array(4).fill(MOVE)),
        apex: Array(10).fill(WORK).concat([CARRY]).concat(Array(5).fill(MOVE))
    },
    hauler: {
        vanguard: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
        sentinel: Array(7).fill(CARRY).concat(Array(4).fill(MOVE)),
        bastion: Array(13).fill(CARRY).concat(Array(7).fill(MOVE)),
        citadel: Array(20).fill(CARRY).concat(Array(10).fill(MOVE)),
        apex: Array(24).fill(CARRY).concat(Array(12).fill(MOVE))
    },
    upgradeHauler: {
        vanguard: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
        sentinel: Array(7).fill(CARRY).concat(Array(4).fill(MOVE)),
        bastion: Array(13).fill(CARRY).concat(Array(7).fill(MOVE)),
        citadel: Array(20).fill(CARRY).concat(Array(10).fill(MOVE)),
        apex: Array(24).fill(CARRY).concat(Array(12).fill(MOVE))
    },
    upgrader: {
        vanguard: [WORK, WORK, CARRY, MOVE],
        sentinel: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
        bastion: Array(7).fill(WORK).concat(Array(2).fill(CARRY)).concat(Array(4).fill(MOVE)),
        citadel: Array(10).fill(WORK).concat(Array(4).fill(CARRY)).concat(Array(6).fill(MOVE)),
        apex: Array(12).fill(WORK).concat(Array(4).fill(CARRY)).concat(Array(8).fill(MOVE))
    },
    builder: {
        vanguard: [WORK, CARRY, CARRY, MOVE, MOVE],
        sentinel: Array(3).fill(WORK).concat(Array(2).fill(CARRY)).concat(Array(3).fill(MOVE)),
        bastion: Array(4).fill(WORK).concat(Array(6).fill(CARRY)).concat(Array(6).fill(MOVE)),
        citadel: Array(6).fill(WORK).concat(Array(10).fill(CARRY)).concat(Array(8).fill(MOVE)),
        apex: Array(8).fill(WORK).concat(Array(10).fill(CARRY)).concat(Array(10).fill(MOVE))
    },
    repairer: {
        vanguard: [WORK, CARRY, CARRY, MOVE, MOVE],
        sentinel: Array(3).fill(WORK).concat(Array(2).fill(CARRY)).concat(Array(3).fill(MOVE)),
        bastion: Array(4).fill(WORK).concat(Array(6).fill(CARRY)).concat(Array(6).fill(MOVE)),
        citadel: Array(6).fill(WORK).concat(Array(10).fill(CARRY)).concat(Array(8).fill(MOVE)),
        apex: Array(8).fill(WORK).concat(Array(10).fill(CARRY)).concat(Array(10).fill(MOVE))
    },
    salvager: {
        vanguard: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
        sentinel: Array(7).fill(CARRY).concat(Array(4).fill(MOVE)),
        bastion: Array(13).fill(CARRY).concat(Array(7).fill(MOVE)),
        citadel: Array(20).fill(CARRY).concat(Array(10).fill(MOVE)),
        apex: Array(24).fill(CARRY).concat(Array(12).fill(MOVE))
    },
    transferHauler: {
        vanguard: [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE],
        sentinel: Array(7).fill(CARRY).concat(Array(4).fill(MOVE)),
        bastion: Array(13).fill(CARRY).concat(Array(7).fill(MOVE)),
        citadel: Array(20).fill(CARRY).concat(Array(10).fill(MOVE)),
        apex: Array(24).fill(CARRY).concat(Array(12).fill(MOVE))
    },
    remoteMiner: {
        vanguard: [WORK, WORK, CARRY, MOVE],
        sentinel: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
        bastion: Array(6).fill(WORK).concat([CARRY]).concat(Array(4).fill(MOVE)),
        citadel: Array(8).fill(WORK).concat([CARRY]).concat(Array(6).fill(MOVE)),
        apex: Array(10).fill(WORK).concat([CARRY]).concat(Array(8).fill(MOVE))
    },
    remoteHauler: {
        vanguard: [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
        sentinel: Array(5).fill(CARRY).concat(Array(5).fill(MOVE)),
        bastion: Array(10).fill(CARRY).concat(Array(10).fill(MOVE)),
        citadel: Array(15).fill(CARRY).concat(Array(15).fill(MOVE)),
        apex: Array(18).fill(CARRY).concat(Array(18).fill(MOVE))
    },
    remoteExtractorMiner: {
        vanguard: [WORK, WORK, CARRY, MOVE],
        sentinel: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
        bastion: Array(6).fill(WORK).concat([CARRY]).concat(Array(4).fill(MOVE)),
        citadel: Array(8).fill(WORK).concat([CARRY]).concat(Array(6).fill(MOVE)),
        apex: Array(10).fill(WORK).concat([CARRY]).concat(Array(8).fill(MOVE))
    },
    pioneer: {
        vanguard: [WORK, CARRY, MOVE, MOVE],
        sentinel: Array(2).fill(WORK).concat(Array(2).fill(CARRY)).concat(Array(4).fill(MOVE)),
        bastion: Array(4).fill(WORK).concat(Array(4).fill(CARRY)).concat(Array(8).fill(MOVE)),
        citadel: Array(6).fill(WORK).concat(Array(6).fill(CARRY)).concat(Array(12).fill(MOVE)),
        apex: Array(7).fill(WORK).concat(Array(7).fill(CARRY)).concat(Array(14).fill(MOVE))
    },
    expedition: {
        vanguard: [CLAIM, MOVE],
        sentinel: [CLAIM, MOVE],
        bastion: [CLAIM, MOVE],
        citadel: [CLAIM, CLAIM, MOVE, MOVE],
        apex: [CLAIM, CLAIM, MOVE, MOVE]
    },
    vanguard: {
        vanguard: [TOUGH, TOUGH, MOVE, MOVE, MOVE, ATTACK, ATTACK],
        sentinel: [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, HEAL],
        bastion: Array(4).fill(TOUGH).concat(Array(6).fill(MOVE)).concat(Array(4).fill(ATTACK)).concat([HEAL]),
        citadel: Array(6).fill(TOUGH).concat(Array(12).fill(MOVE)).concat(Array(5).fill(ATTACK)).concat([HEAL]),
        apex: Array(10).fill(TOUGH).concat(Array(15).fill(MOVE)).concat(Array(8).fill(ATTACK)).concat([HEAL])
    },
    breaker: {
        vanguard: [ATTACK, ATTACK, MOVE, MOVE],
        sentinel: Array(4).fill(ATTACK).concat(Array(4).fill(MOVE)),
        bastion: Array(7).fill(ATTACK).concat(Array(7).fill(MOVE)),
        citadel: Array(10).fill(ATTACK).concat(Array(10).fill(MOVE)),
        apex: Array(13).fill(ATTACK).concat(Array(13).fill(MOVE))
    },
    remoteBuilder: {
        vanguard: [WORK, CARRY, CARRY, MOVE, MOVE],
        sentinel: Array(3).fill(WORK).concat(Array(2).fill(CARRY)).concat(Array(3).fill(MOVE)),
        bastion: Array(4).fill(WORK).concat(Array(6).fill(CARRY)).concat(Array(6).fill(MOVE)),
        citadel: Array(6).fill(WORK).concat(Array(10).fill(CARRY)).concat(Array(8).fill(MOVE)),
        apex: Array(8).fill(WORK).concat(Array(10).fill(CARRY)).concat(Array(10).fill(MOVE))
    },
    claimer: {
        vanguard: [CLAIM, MOVE]
    }
};
