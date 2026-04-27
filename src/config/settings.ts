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
        "E58S58": '6654f475659b91ae40301a05',
        //rooms I want to break into to get to the controller
        "E58S59": '66fea842535f3f45d9e35bc3',
        "E59S59": '690d88dcd4824c61d123c725'
    },
    attackWalls: false,
    attackRamparts: false,
    //wall and rampart repair settings
    roomWallMaxHits: {
        "E59S58": 25e4,
        'E58S58': 1e5,
        "E58S57": 1e5,
        "E57S57": 1e5,
        "E55S58": 1e5
    },
    roomRampartMaxHits: {
        "E59S58": 1e5,
        'E58S58': 1e4,
        "E58S57": 1e5,
        "E57S57": 1e4,
        "E55S58": 1e4
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

    roomQuotas: {
        'E59S58': {
            defender: 0,
            miner: 2,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 2,
            upgradeHauler: 0,
            upgrader: 1,
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
        },
        "E58S58": {
            defender: 0,
            miner: 2,
            dismantleMiner: 1,
            extractorMiner: 0,
            hauler: 3,
            upgradeHauler: 0,
            upgrader: 0,
            builder: 3,
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
        },
        "E58S57": {   // main room
            defender: 0,
            miner: 2,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 2,
            upgradeHauler: 0,
            upgrader: 1,
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
        },
        "E57S57": {
            defender: 0,
            miner: 2,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 1,
            upgradeHauler: 2,
            upgrader: 1,
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
        },
        "E55S58": {
            defender: 0,
            miner: 2,
            dismantleMiner: 0,
            extractorMiner: 0,
            hauler: 2,
            upgradeHauler: 1,
            upgrader: 1,
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
        }
    }
};
