import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_MY_SPAWNS = 1;
});

import { CreepManager } from '../src/managers/CreepManager';
import { RoleRegistry } from '../src/roles';

// Mock RoleRegistry
vi.mock('../src/roles', () => ({
    RoleRegistry: {
        miner: { run: vi.fn() },
        hauler: { run: vi.fn() }
    }
}));

describe('CreepManager', () => {
    let mockCreep: any;
    let mockSpawn: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockSpawn = {
            recycleCreep: vi.fn().mockReturnValue(0)
        };

        mockCreep = {
            name: 'test_creep',
            spawning: false,
            memory: { role: 'miner' },
            say: vi.fn(),
            moveTo: vi.fn(),
            pos: {
                findClosestByRange: vi.fn().mockReturnValue(mockSpawn)
            }
        };

        (globalThis as any).Game = {
            creeps: {
                'test_creep': mockCreep
            }
        };
    });

    it('should ignore spawning creeps', () => {
        mockCreep.spawning = true;
        CreepManager.run();
        expect(RoleRegistry.miner.run).not.toHaveBeenCalled();
    });

    it('should recycle creep if memory.recycle is true', () => {
        mockCreep.memory.recycle = true;
        CreepManager.run();
        
        expect(mockCreep.say).toHaveBeenCalledWith('♻️ recycle');
        expect(mockCreep.pos.findClosestByRange).toHaveBeenCalledWith(FIND_MY_SPAWNS);
        expect(mockSpawn.recycleCreep).toHaveBeenCalledWith(mockCreep);
        expect(RoleRegistry.miner.run).not.toHaveBeenCalled();
    });

    it('should run the correct role handler for the creep', () => {
        CreepManager.run();
        expect(RoleRegistry.miner.run).toHaveBeenCalledWith(mockCreep);
    });

    it('should handle unknown roles gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        mockCreep.memory.role = 'unknown_role';
        
        CreepManager.run();
        
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown role: unknown_role'));
        consoleSpy.mockRestore();
    });
});
