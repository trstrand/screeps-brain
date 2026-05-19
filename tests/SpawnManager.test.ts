import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to ensure these globals are defined BEFORE any imports are processed
vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_ENOUGH_ENERGY = -6;
    (globalThis as any).FIND_MY_SPAWNS = 1;
    (globalThis as any).FIND_HOSTILE_CREEPS = 103;
    (globalThis as any).FIND_SOURCES = 112;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).FIND_MINERALS = 116;
    (globalThis as any).FIND_CONSTRUCTION_SITES = 111;
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_STORAGE = 'storage';
    (globalThis as any).STRUCTURE_SPAWN = 'spawn';
    (globalThis as any).STRUCTURE_EXTENSION = 'extension';
    (globalThis as any).STRUCTURE_TOWER = 'tower';
    (globalThis as any).STRUCTURE_WALL = 'wall';
    (globalThis as any).STRUCTURE_RAMPART = 'rampart';
    (globalThis as any).STRUCTURE_ROAD = 'road';
    (globalThis as any).STRUCTURE_EXTRACTOR = 'extractor';
    (globalThis as any).STRUCTURE_CONTROLLER = 'controller';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';

    (globalThis as any).MOVE = 'move';
    (globalThis as any).WORK = 'work';
    (globalThis as any).CARRY = 'carry';
    (globalThis as any).ATTACK = 'attack';
    (globalThis as any).RANGED_ATTACK = 'ranged_attack';
    (globalThis as any).HEAL = 'heal';
    (globalThis as any).TOUGH = 'tough';
    (globalThis as any).CLAIM = 'claim';
});

import { SpawnManager } from '../src/managers/SpawnManager';
import { COLONY_SETTINGS } from '../src/config/settings';

// Mocking Screeps Globals
const mockSpawn = {
    spawnCreep: vi.fn().mockReturnValue(0), // OK
    spawning: null
};

const mockRoom = {
    name: 'E1N1',
    energyCapacityAvailable: 1000,
    energyAvailable: 1000,
    find: vi.fn().mockImplementation((type) => {
        if (type === 1 /* FIND_MY_SPAWNS */) return [mockSpawn];
        if (type === 103 /* FIND_HOSTILE_CREEPS */) return [];
        if (type === 112 /* FIND_SOURCES */) return [{ id: 'source1' }, { id: 'source2' }];
        if (type === 111 /* FIND_CONSTRUCTION_SITES */) return [];
        return [];
    }),
    controller: { my: true, pos: { findInRange: vi.fn().mockReturnValue([]) } },
    memory: {}
};

// Mock Game object
(globalThis as any).Game = {
    creeps: {},
    time: 100,
    spawns: { 'Spawn1': mockSpawn },
    rooms: { 'E1N1': mockRoom }
};

describe('SpawnManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Game.creeps = {};
        mockRoom.memory = {};
        
        // Default Quotas
        COLONY_SETTINGS.roomQuotas = {
            'E1N1': {
                miner: 2,
                hauler: 2,
                upgrader: 1
            }
        };
        COLONY_SETTINGS.remoteMining = {};
    });

    it('should assign sourceIndex 0 to the first miner during critical recovery', () => {
        SpawnManager.run(mockRoom as any);

        expect(mockSpawn.spawnCreep).toHaveBeenCalledWith(
            expect.any(Array),
            expect.stringContaining('miner'),
            expect.objectContaining({
                memory: expect.objectContaining({
                    role: 'miner',
                    sourceIndex: 0,
                    working: true
                })
            })
        );
    });

    it('should assign sourceIndex 1 to the second miner during normal quota filling', () => {
        // Mock existing miner with index 0
        (Game as any).creeps = {
            'miner_1': { 
                name: 'miner_1',
                memory: { role: 'miner', homeRoom: 'E1N1', sourceIndex: 0 },
                room: mockRoom
            } as any
        };

        // Also need a hauler so it doesn't stay in critical recovery for haulers
        (Game as any).creeps['hauler_1'] = {
            name: 'hauler_1',
            memory: { role: 'hauler', homeRoom: 'E1N1' },
            room: mockRoom
        } as any;
        
        // Need an upgrader too
        (Game as any).creeps['upgrader_1'] = {
            name: 'upgrader_1',
            memory: { role: 'upgrader', homeRoom: 'E1N1' },
            room: mockRoom
        } as any;

        SpawnManager.run(mockRoom as any);

        const minerCall = mockSpawn.spawnCreep.mock.calls.find(call => call[1].startsWith('miner'));
        
        expect(minerCall).toBeDefined();
        expect(minerCall![2].memory).toMatchObject({
            role: 'miner',
            sourceIndex: 1
        });
    });

    it('should skip builder if no construction sites exist', () => {
        // Satisfy all other quotas
        (Game as any).creeps = {
            'miner1': { memory: { role: 'miner', homeRoom: 'E1N1', sourceIndex: 0 } },
            'miner2': { memory: { role: 'miner', homeRoom: 'E1N1', sourceIndex: 1 } },
            'hauler1': { memory: { role: 'hauler', homeRoom: 'E1N1' } },
            'hauler2': { memory: { role: 'hauler', homeRoom: 'E1N1' } },
            'upgrader1': { memory: { role: 'upgrader', homeRoom: 'E1N1' } }
        } as any;

        COLONY_SETTINGS.roomQuotas['E1N1'].builder = 1;

        // Mock room.find for construction sites to return empty
        mockRoom.find = vi.fn().mockImplementation((type) => {
            if (type === 111 /* FIND_CONSTRUCTION_SITES */) return [];
            return [];
        });

        SpawnManager.run(mockRoom as any);

        const builderCall = mockSpawn.spawnCreep.mock.calls.find(call => call[1].startsWith('builder'));
        expect(builderCall).toBeUndefined();
    });
});
