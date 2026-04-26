export const COLONY_SETTINGS: ColonySettings = {
    expeditionTargets: ['E59S55'],
    pioneerTarget: 'E55S58',
    breakerTarget: { room: 'E58S59', id: '66fea842535f3f45d9e35bc3' },
    defendRoom: 'E55S58',
    salvageRoom: '', // Leave empty to salvage in the home room, or set a target room string
    remoteBuild: '',
    claimRoom: '',
    ignoredSources: ['none'],
    //dismantle targets and wall/rampart attack settings
    dismantleTargets: {
        "E57S57": 'none',
        "E58S57": 'none',
        "E58S58": '6654f475659b91ae40301a05',
        //rooms I want to break into to get to the controller
        "E58S59": '66fea842535f3f45d9e35bc3',
        "E59S59": '690d88dcd4824c61d123c725'
    },
    attackWalls: false,
    attackRamparts: false,
    //wall and rampart repair settings
    wallMaxHits: 1000,
    rampartMaxHits: 1000,
    roomWallMaxHits: {
        "E59S58": 25e4,
        "E58S58": 1e3,
        "E58S57": 5e4,
        "E57S57": 1e4
    },
    roomRampartMaxHits: {
        'E59S58': 100000,
        'E58S58': 1000,
        'E58S57': 1000,
        'E57S57': 100

    },
    remoteMining: {
        'E59S58': [], // Example: 'HomeRoom': ['RemoteRoom1', 'RemoteRoom2']
    },
    mineralQuotas: {
        'E59S58': 10000,
    },
    resourceTransfers: [
        // { sourceRoom: 'E59S58', destRoom: 'E58S58', resource: RESOURCE_ENERGY, count: 0 }
    ],
    debug: false,

    /*
    this is a just of creeps to reference for the roomQuotas
            defender: 0,
            miner: 0,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 0,
            upgradeHauler: 0,
            upgrader: 0,
            builder: 0,
            repairer: 0,
            salvager: 0,
            transferHauler: 0,
            remoteMiner: 0,
            remoteHauler: 0,
            remoteExtractorMiner: 0,
            pioneer: 0,    
            expedition: 0,
            vanguard: 0,
            breaker: 0,
            remoteBuilder: 0,
            claimer: 0
    */

    roomQuotas: {
        'E59S58': {
            defender: 0,
            miner: 2,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 2,
            upgradeHauler: 1,
            upgrader: 2,
            builder: 0,
            repairer: 1,
            salvager: 0,
            transferHauler: 0,
            remoteMiner: 0,
            remoteHauler: 0,
            remoteExtractorMiner: 0,
            pioneer: 0,
            expedition: 0,
            vanguard: 0,
            breaker: 0,
            remoteBuilder: 0,
            claimer: 0
        },
        "E58S58": {
            defender: 0,
            miner: 2,
            dismantleMiner: 1,
            extractorMiner: 0,
            hauler: 2,
            upgradeHauler: 2,
            upgrader: 2,
            builder: 0,
            repairer: 1,
            salvager: 0,
            transferHauler: 0,
            remoteMiner: 0,
            remoteHauler: 0,
            remoteExtractorMiner: 0,
            pioneer: 0,
            expedition: 0,
            vanguard: 0,
            breaker: 0,
            remoteBuilder: 0,
            claimer: 0
        },
        //E58S57 is the main room for spawning remote creeps
        "E58S57": {
            defender: 0,
            miner: 2,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 2,
            upgradeHauler: 1,
            upgrader: 2,
            builder: 0,
            repairer: 0,
            salvager: 0,
            transferHauler: 0,
            remoteMiner: 0,
            remoteHauler: 0,
            remoteExtractorMiner: 0,
            pioneer: 0,
            expedition: 1,
            vanguard: 0,
            breaker: 2,
            remoteBuilder: 0,
            claimer: 0
        },
        "E57S57": {
            defender: 0,
            miner: 2,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 1,
            upgradeHauler: 2,
            upgrader: 2,
            builder: 0,
            repairer: 1,
            salvager: 0,
            transferHauler: 0,
            remoteMiner: 0,
            remoteHauler: 0,
            remoteExtractorMiner: 0,
            pioneer: 0,
            expedition: 0,
            vanguard: 0,
            breaker: 0,
            remoteBuilder: 0,
            claimer: 0
        },
        "E55S58": {
            defender: 0,
            miner: 2,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 2,
            upgradeHauler: 1,
            upgrader: 2,
            builder: 0,
            repairer: 1,
            salvager: 0,
            transferHauler: 0,
            remoteMiner: 0,
            remoteHauler: 0,
            remoteExtractorMiner: 0,
            pioneer: 0,
            expedition: 0,
            vanguard: 0,
            breaker: 0,
            remoteBuilder: 0,
            claimer: 0
        }
    }
};

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
        //industrial: Array(6).fill(WORK).concat([CARRY]).concat(Array(3).fill(MOVE))
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
        industrial: Array(12).fill(CARRY).concat(Array(6).fill(MOVE))
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
        established: Array(5).fill(TOUGH).concat(Array(15).fill(MOVE)).concat(Array(10).fill(ATTACK)).concat(Array(5).fill(HEAL))
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