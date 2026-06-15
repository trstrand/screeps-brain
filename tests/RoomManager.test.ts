import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).FIND_SOURCES = 112;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).STRUCTURE_POWER_SPAWN = 'powerSpawn';
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
});

import { RoomManager } from '../src/managers/RoomManager';
import { SpawnManager } from '../src/managers/SpawnManager';
import { TowerManager } from '../src/managers/TowerManager';
import { LinkManager } from '../src/managers/LinkManager';

vi.mock('../src/managers/SpawnManager', () => ({ SpawnManager: { run: vi.fn() } }));
vi.mock('../src/managers/TowerManager', () => ({ TowerManager: { run: vi.fn() } }));
vi.mock('../src/managers/LinkManager', () => ({ LinkManager: { run: vi.fn() } }));
vi.mock('../src/config/settings', () => ({
    COLONY_SETTINGS: {
        dismantleTargets: {
            'W1N1': 'target123'
        }
    }
}));

describe('RoomManager', () => {
    let mockRoom: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockRoom = {
            name: 'W1N1',
            controller: { my: true },
            memory: {},
            find: vi.fn().mockImplementation((type) => {
                if (type === FIND_SOURCES) return [{ id: 'source1' }, { id: 'source2' }];
                return [];
            })
        };

        (globalThis as any).Game = {
            rooms: {
                'W1N1': mockRoom
            }
        };
    });

    it('should ignore rooms without a controller or unowned rooms', () => {
        mockRoom.controller.my = false;
        RoomManager.run();
        
        expect(SpawnManager.run).not.toHaveBeenCalled();
    });

    it('should initialize source IDs in memory if not present', () => {
        RoomManager.run();
        
        expect(mockRoom.find).toHaveBeenCalledWith(FIND_SOURCES);
        expect(mockRoom.memory.sourceIds).toEqual(['source1', 'source2']);
    });

    it('should map dismantle targets into memory from settings', () => {
        RoomManager.run();
        expect(mockRoom.memory.dismantleMiningTarget).toBe('target123');
    });

    it('should run all child managers for owned rooms', () => {
        RoomManager.run();
        
        expect(SpawnManager.run).toHaveBeenCalledWith(mockRoom);
        expect(TowerManager.run).toHaveBeenCalledWith(mockRoom);
        expect(LinkManager.run).toHaveBeenCalledWith(mockRoom);
    });

    it('should processPower if power spawn has enough energy and power', () => {
        const mockPowerSpawn = {
            structureType: 'powerSpawn',
            store: {
                power: 10,
                energy: 1000
            },
            processPower: vi.fn()
        };

        mockRoom.find = vi.fn().mockImplementation((type) => {
            if (type === FIND_SOURCES) return [];
            if (type === FIND_MY_STRUCTURES) return [mockPowerSpawn];
            return [];
        });

        RoomManager.run();

        expect(mockPowerSpawn.processPower).toHaveBeenCalled();
    });

    it('should not processPower if power spawn does not have enough energy', () => {
        const mockPowerSpawn = {
            structureType: 'powerSpawn',
            store: {
                power: 10,
                energy: 40
            },
            processPower: vi.fn()
        };

        mockRoom.find = vi.fn().mockImplementation((type) => {
            if (type === FIND_SOURCES) return [];
            if (type === FIND_MY_STRUCTURES) return [mockPowerSpawn];
            return [];
        });

        RoomManager.run();

        expect(mockPowerSpawn.processPower).not.toHaveBeenCalled();
    });
});
