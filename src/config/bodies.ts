export const CREEP_CONFIGS: Record<string, RoleBodyConfig> = {
    defender: {
        starter: [TOUGH, TOUGH, MOVE, MOVE, ATTACK, MOVE],
        established: [TOUGH, TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK],
        industrial: Array(10).fill(TOUGH).concat(Array(20).fill(MOVE)).concat(Array(10).fill(ATTACK))
    },
    miner: {
        starter: [WORK, CARRY, MOVE, MOVE],
        established: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
        industrial: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE]
    },
    dismantleMiner: {
        standard: [WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE]
    },
    extractorMiner: {
        starter: [WORK, WORK, CARRY, MOVE],
        established: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE],
        industrial: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE]
    },
    hauler: {
        starter: [CARRY, CARRY, MOVE, MOVE],
        established: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
        industrial: Array(12).fill(CARRY).concat(Array(6).fill(MOVE))
    },
    upgradeHauler: {
        starter: [CARRY, CARRY, MOVE, MOVE],
        established: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
        industrial: Array(12).fill(CARRY).concat(Array(6).fill(MOVE))
    },
    upgrader: {
        starter: [WORK, CARRY, MOVE, MOVE],
        established: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
        industrial: [WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE]
    },
    builder: {
        starter: [WORK, CARRY, MOVE, MOVE],
        established: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
        industrial: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    },
    repairer: {
        starter: [WORK, CARRY, MOVE, MOVE],
        established: [WORK, WORK, CARRY, CARRY, MOVE, MOVE],
        industrial: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    },
    salvager: {
        starter: [CARRY, CARRY, MOVE, MOVE],
        established: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
        //industrial: Array(12).fill(CARRY).concat(Array(6).fill(MOVE))
        industrial: Array(24).fill(CARRY).concat(Array(12).fill(MOVE))
    },
    transferHauler: {
        starter: [CARRY, CARRY, MOVE, MOVE],
        established: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
        industrial: Array(25).fill(CARRY).concat(Array(25).fill(MOVE))
    },
    remoteMiner: {
        starter: [WORK, WORK, CARRY, MOVE],
        established: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
        industrial: [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE]
    },
    remoteHauler: {
        starter: [CARRY, CARRY, MOVE, MOVE],
        established: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE],
        industrial: Array(15).fill(CARRY).concat(Array(15).fill(MOVE))
    },
    remoteExtractorMiner: {
        starter: [WORK, WORK, CARRY, MOVE],
        established: [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE],
        industrial: Array(10).fill(WORK).concat([CARRY]).concat(Array(5).fill(MOVE))
    },
    pioneer: {
        standard: Array(4).fill(WORK).concat(Array(4).fill(CARRY)).concat(Array(8).fill(MOVE))
    },
    expedition: {
        standard: [CLAIM, CLAIM, MOVE, MOVE]
    },
    vanguard: {
        standard: [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, HEAL]
    },
    breaker: {
        standard: [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE, ATTACK, ATTACK, HEAL],
        //established: Array(5).fill(TOUGH).concat(Array(15).fill(MOVE)).concat(Array(10).fill(ATTACK)).concat(Array(5).fill(HEAL))
        established: Array(8).fill(ATTACK).concat(Array(8).fill(MOVE))
    },
    remoteBuilder: {
        starter: [WORK, CARRY, MOVE, MOVE],
        established: [WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE],
        industrial: [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE]
    },
    claimer: {
        standard: [CLAIM, MOVE]
    }
};
