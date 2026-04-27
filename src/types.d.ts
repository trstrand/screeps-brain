export {};

declare global {
    interface Memory {
        lastExpeditionSpawn: { [roomName: string]: number };
    }

    interface RoomQuota {
        defender?: number;
        miner?: number;
        dismantleMiner?: number;
        extractorMiner?: number;
        hauler?: number;
        upgradeHauler?: number;
        upgrader?: number;
        builder?: number;
        repairer?: number;
        salvager?: number;
        transferHauler?: number;
        remoteMiner?: number;
        remoteHauler?: number;
        remoteExtractorMiner?: number;
        pioneer?: number;    
        expedition?: number;
        vanguard?: number;
        breaker?: number;
        remoteBuilder?: number;
        claimer?: number;
    }

    interface ResourceTransfer {
        sourceRoom: string;
        destRoom: string;
        resource: ResourceConstant;
        count: number;
    }

    interface ColonySettings {
        expeditionTargets: string[];
        pioneerTarget: string;
        breakerTarget: { room: string, id: string };
        defendRoom: string;
        salvageRoom?: string;
        remoteBuild?: string;
        claimRoom?: string;
        roomWallMaxHits?: { [roomName: string]: number };
        roomRampartMaxHits?: { [roomName: string]: number };
        attackWalls: boolean;
        attackRamparts: boolean;
        ignoredSources: string[];
        dismantleTargets: { [roomName: string]: string };
        roomQuotas: { [roomName: string]: RoomQuota };
        remoteMining: { [roomName: string]: string[] };
        mineralQuotas: { [roomName: string]: number };
        resourceTransfers?: ResourceTransfer[];
        debug: boolean;
    }

    interface CreepMemory {
        role: string;
        working: boolean;
        homeRoom: string;
        recycle?: boolean;
        targetRoom?: string;
        targetId?: Id<any>;
        deliveryTargetId?: Id<any>;
        sourceIndex?: number; 
        targetContainerId?: Id<StructureContainer>;
        repairTargetId?: Id<Structure>;
        dismantleWork?: boolean;
        dismantleTarget?: Id<any>;
        sourceRoom?: string;
        destinationRoom?: string;
        transferResource?: ResourceConstant;
        idleTicks?: number;
        dismantleExtensions?: boolean;
    }

    interface RoomMemory {
        sourceIds: Id<Source>[];
        dismantleMiningTarget?: Id<Structure>;
        towerRepairTargetId?: Id<Structure>;
    }

    interface RoleHandler {
        run: (creep: Creep) => void;
        [methodName: string]: any;
    }

    interface RoleBodyConfig {
        vanguard?: BodyPartConstant[];
        sentinel?: BodyPartConstant[];
        bastion?: BodyPartConstant[];
        citadel?: BodyPartConstant[];
        apex?: BodyPartConstant[];
    }
}