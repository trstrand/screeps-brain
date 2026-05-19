import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).FIND_MY_STRUCTURES = 102;
    (globalThis as any).STRUCTURE_CONTAINER = 'container';
    (globalThis as any).STRUCTURE_LINK = 'link';
    (globalThis as any).STRUCTURE_STORAGE = 'storage';
    (globalThis as any).RESOURCE_ENERGY = 'energy';
    (globalThis as any).LOOK_CREEPS = 'creep';
});

import { roleUpgrader } from '../src/roles/upgrader';

describe('Role: Upgrader', () => {
    let mockCreep: any;
    let mockController: any;
    let mockContainer: any;
    
    beforeEach(() => {
        vi.clearAllMocks();

        mockContainer = {
            id: 'container_1',
            structureType: 'container',
            hits: 1000,
            hitsMax: 1000,
            pos: {
                lookFor: vi.fn().mockReturnValue([])
            },
            store: {
                [RESOURCE_ENERGY]: 500,
                getUsedCapacity: vi.fn().mockReturnValue(500)
            }
        };

        mockController = {
            id: 'controller_1',
            pos: {
                findInRange: vi.fn().mockImplementation((type) => {
                    if (type === (globalThis as any).FIND_STRUCTURES) return [mockContainer];
                    return [];
                })
            }
        };

        mockCreep = {
            name: 'upgrader_test',
            memory: { role: 'upgrader', working: true, targetId: null },
            room: {
                controller: mockController,
                memory: { controllerLink: null }
            },
            pos: {
                isEqualTo: vi.fn().mockReturnValue(false),
                getRangeTo: vi.fn().mockReturnValue(5)
            },
            store: {
                getFreeCapacity: vi.fn().mockReturnValue(0),
                getUsedCapacity: vi.fn().mockReturnValue(50),
                [RESOURCE_ENERGY]: 50
            },
            say: vi.fn(),
            moveTo: vi.fn(),
            upgradeController: vi.fn().mockReturnValue(0),
            withdraw: vi.fn(),
            repair: vi.fn()
        };

        (globalThis as any).Game = {
            getObjectById: vi.fn().mockReturnValue(null)
        };
    });

    it('should upgrade the controller when memory.working is true', () => {
        roleUpgrader.run(mockCreep);
        
        expect(mockCreep.upgradeController).toHaveBeenCalledWith(mockController);
    });

    it('should moveTo controller if ERR_NOT_IN_RANGE', () => {
        mockCreep.upgradeController.mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE);
        
        roleUpgrader.run(mockCreep);
        
        expect(mockCreep.moveTo).toHaveBeenCalledWith(mockController, expect.objectContaining({ range: 3 }));
    });

    it('should move to the container if not standing on it', () => {
        roleUpgrader.run(mockCreep);
        expect(mockCreep.moveTo).toHaveBeenCalledWith(mockContainer, expect.objectContaining({ range: 0 }));
    });

    it('should repair container if standing on it and hits are low', () => {
        mockCreep.pos.isEqualTo.mockReturnValue(true);
        mockContainer.hits = 500; // Low hits
        
        roleUpgrader.run(mockCreep);
        
        expect(mockCreep.repair).toHaveBeenCalledWith(mockContainer);
    });

    it('should switch to fetch mode when energy is 0 and no local energy available', () => {
        mockCreep.store[RESOURCE_ENERGY] = 0;
        mockCreep.store.getUsedCapacity.mockReturnValue(0);
        mockContainer.store[RESOURCE_ENERGY] = 0; // Empty container
        
        roleUpgrader.run(mockCreep);
        
        expect(mockCreep.memory.working).toBe(false);
        expect(mockCreep.say).toHaveBeenCalledWith('🔍 Fetch');
    });
});
