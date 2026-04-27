import { COLONY_SETTINGS } from '../config/settings';
import { CREEP_CONFIGS } from '../config/bodies';


const SPAWN_PRIORITY: string[] = [
    'miner',
    'hauler',
    'upgrader',
    'dismantleMiner',
    'repairer',
    'builder',
    'upgradeHauler',
    'extractorMiner',
    'salvager',
    'transferHauler',
    'remoteMiner',
    'remoteHauler',
    'remoteExtractorMiner',
    'pioneer',
    'expedition',
    'vanguard',
    'breaker',
    'remoteBuilder',
    'claimer'
];

export class SpawnManager {
    static getBody(roleName: string, cap: number): BodyPartConstant[] {
        const config = CREEP_CONFIGS[roleName];
        if (!config) return [];
        if (cap >= 1800 && config.apex) return config.apex;
        if (cap >= 1500 && config.citadel) return config.citadel;
        if (cap >= 1000 && config.bastion) return config.bastion;
        if (cap >= 550 && config.sentinel) return config.sentinel;
        return config.vanguard || [];
    }

    static run(room: Room) {
        const spawn = room.find(FIND_MY_SPAWNS, { filter: s => !s.spawning })[0];
        if (!spawn) return;

        const energyCap = room.energyCapacityAvailable;
        const baseMem = { homeRoom: room.name, working: false, recycle: false };
        const quotas = COLONY_SETTINGS.roomQuotas[room.name] || {};

        const localCreeps = Object.values(Game.creeps).filter(c => c.memory.homeRoom === room.name);

        // OPTIMIZATION: Group local creeps by role once per tick instead of filtering in loops
        const localRoleCounts: Record<string, number> = {};
        for (const c of localCreeps) {
            localRoleCounts[c.memory.role] = (localRoleCounts[c.memory.role] || 0) + 1;
        }

        const miners = localRoleCounts['miner'] || 0;
        const haulers = localRoleCounts['hauler'] || 0;

        // Emergency recovery uses available energy
        const bodyEnergy = (miners === 0 || haulers === 0) ? room.energyAvailable : energyCap;

        // 1. TOP PRIORITY: Defender (if hostiles present)
        const hostiles = room.find(FIND_HOSTILE_CREEPS);
        const defenders = localRoleCounts['defender'] || 0;
        if (hostiles.length > 0 && defenders === 0) {
            const body = this.getBody('defender', bodyEnergy);
            if (spawn.spawnCreep(body, `defender_${Game.time}`, { memory: { ...baseMem, role: 'defender' } }) === OK) return;
        }

        // 2. CRITICAL ROLES: First One (Priority Order: miner, hauler, upgrader)
        const criticalRoles = ['miner', 'hauler', 'upgrader'];
        for (const role of criticalRoles) {
            const count = localRoleCounts[role] || 0;
            const quota = (quotas as any)[role] || 0;

            if (count === 0 && quota > 0) {
                let memory: any = { ...baseMem, role };
                if (role === 'miner') {
                    memory.working = true;
                    memory.sourceIndex = 0; // First one always takes index 0
                }
                const body = this.getBody(role, bodyEnergy);
                if (spawn.spawnCreep(body, `${role}_${Game.time}`, { memory }) === OK) return;
            }
        }

        // 3. FILL QUOTAS: (Priority Order as requested)
        for (const role of SPAWN_PRIORITY) {
            const isRemoteRole = role === 'remoteMiner' || role === 'remoteHauler' || role === 'remoteExtractorMiner';

            // --- EXPEDITION MULTI-TARGET LOGIC ---
            if (role === 'expedition') {
                const targetCount = (quotas as any)[role] || 0;
                if (targetCount === 0) continue; // Only spawn from rooms that have an expedition quota

                const targets = COLONY_SETTINGS.expeditionTargets || [];
                // Robust memory initialization
                if (typeof Memory.lastExpeditionSpawn !== 'object' || Memory.lastExpeditionSpawn === null) {
                    Memory.lastExpeditionSpawn = {};
                }

                for (const targetRoomName of targets) {
                    const lastSpawn = Memory.lastExpeditionSpawn[targetRoomName] || 0;
                    const cooldown = 900;
                    const canSpawn = (Game.time - lastSpawn) >= cooldown;

                    const existing = Object.values(Game.creeps).find(c =>
                        c.memory.role === 'expedition' && c.memory.targetRoom === targetRoomName
                    );

                    if (canSpawn && !existing) {
                        let memory: any = { ...baseMem, role, targetRoom: targetRoomName };
                        const body = this.getBody(role, bodyEnergy);
                        const result = spawn.spawnCreep(body, `${role}_${targetRoomName}_${Game.time}`, { memory });

                        if (result === OK) {
                            Memory.lastExpeditionSpawn[targetRoomName] = Game.time;
                            console.log(`🚀 [Spawn] Room ${room.name} launching expedition to ${targetRoomName}`);
                            return;
                        } else if (result !== ERR_NOT_ENOUGH_ENERGY) {
                            // Log unexpected errors (but not "waiting for energy")
                            console.log(`⚠️ [Spawn] Room ${room.name} failed expedition spawn: ${result}`);
                        }
                    }
                }
                continue; // Move to next role in priority
            }

            if (isRemoteRole) {
                const remoteRooms = COLONY_SETTINGS.remoteMining[room.name] || [];
                for (const remoteRoomName of remoteRooms) {
                    const remoteQuotas = COLONY_SETTINGS.roomQuotas[remoteRoomName] || {};
                    const targetCount = (remoteQuotas as any)[role] || 0;
                    const roleCount = localCreeps.filter(c =>
                        c.memory.role === role &&
                        c.memory.targetRoom === remoteRoomName
                    ).length;

                    if (roleCount < targetCount) {
                        let memory: any = { ...baseMem, role, targetRoom: remoteRoomName };
                        if (role === 'remoteMiner') {
                            const roomCreeps = localCreeps.filter(c => c.memory.targetRoom === remoteRoomName && c.memory.role === role);
                            const assignedIndices = roomCreeps.map(c => c.memory.sourceIndex ?? -1);
                            memory.sourceIndex = [0, 1].find(i => !assignedIndices.includes(i)) ?? 0;
                        }

                        const body = this.getBody(role, bodyEnergy);
                        if (spawn.spawnCreep(body, `${role}_${remoteRoomName}_${Game.time}`, { memory }) === OK) return;
                    }
                }
                continue;
            }

            // Local Role Filling
            const roleCount = localRoleCounts[role] || 0;
            let targetCount = (quotas as any)[role] || 0;

            // Skip if special conditions aren't met
            if (role === 'builder' && targetCount > 0 && room.find(FIND_CONSTRUCTION_SITES).length === 0) targetCount = 0;
            if (role === 'upgradeHauler' && targetCount > 0) {
                const controller = room.controller;
                const containerNearController = controller ? controller.pos.findInRange(FIND_STRUCTURES, 4, {
                    filter: s => s.structureType === STRUCTURE_CONTAINER
                }).length > 0 : false;
                if (!containerNearController) targetCount = 0;
            }
            if (role === 'extractorMiner' && targetCount > 0) {
                const hasExtractor = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_EXTRACTOR } }).length > 0;
                if (!hasExtractor) targetCount = 0;

                const mineral = room.find(FIND_MINERALS)[0];
                const quota = COLONY_SETTINGS.mineralQuotas[room.name];
                if (mineral && quota !== undefined && room.storage) {
                    const currentStock = room.storage.store.getUsedCapacity(mineral.mineralType);
                    if (currentStock >= quota) targetCount = 0;
                }
            }

            if (roleCount < targetCount) {
                let memory: any = { ...baseMem, role };

                // Specific setup for roles
                if (role === 'miner') {
                    const allMiners = localCreeps.filter(c => c.memory.role === 'miner');
                    const assignedSources = allMiners.map(m => m.memory.sourceIndex ?? -1);
                    memory.working = true;
                    memory.sourceIndex = [0, 1].find(i => !assignedSources.includes(i)) ?? 0;
                }

                // --- PIONEER TARGETING ---
                if (role === 'pioneer') {
                    memory.targetRoom = COLONY_SETTINGS.pioneerTarget;
                }

                if (role === 'breaker') {
                    memory.targetRoom = COLONY_SETTINGS.breakerTarget.room;
                    memory.targetId = COLONY_SETTINGS.breakerTarget.id;
                }


                if (role === 'transferHauler') {
                    const transfers = COLONY_SETTINGS.resourceTransfers || [];
                    const transfer = transfers.find(t => t.sourceRoom === room.name);
                    if (transfer) {
                        memory.sourceRoom = transfer.sourceRoom;
                        memory.destinationRoom = transfer.destRoom;
                        memory.transferResource = transfer.resource;
                    } else continue;
                }
                if (role === 'vanguard') memory.targetRoom = COLONY_SETTINGS.defendRoom;
                if (role === 'salvager' && COLONY_SETTINGS.salvageRoom) memory.targetRoom = COLONY_SETTINGS.salvageRoom;
                if (role === 'remoteBuilder' && COLONY_SETTINGS.remoteBuild) memory.targetRoom = COLONY_SETTINGS.remoteBuild;
                if (role === 'claimer' && COLONY_SETTINGS.claimRoom) memory.targetRoom = COLONY_SETTINGS.claimRoom;

                const body = this.getBody(role, bodyEnergy);
                const result = spawn.spawnCreep(body, `${role}_${Game.time}`, { memory });
                if (result === OK) return;
                if (result === ERR_NOT_ENOUGH_ENERGY) return; // Wait for energy
            }
        }
    }
}
