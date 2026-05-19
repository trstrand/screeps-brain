import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).Memory = { creeps: {} };
    (globalThis as any).Game = { creeps: {} };
});

import { MemoryManager } from '../src/managers/MemoryManager';

describe('MemoryManager', () => {
    beforeEach(() => {
        Memory.creeps = {};
        Game.creeps = {};
    });

    it('should delete memory for creeps that do not exist in Game.creeps', () => {
        Memory.creeps = {
            'dead_creep': { role: 'miner' },
            'alive_creep': { role: 'hauler' }
        } as any;

        Game.creeps = {
            'alive_creep': {} as any
        };

        MemoryManager.run();

        expect(Memory.creeps['dead_creep']).toBeUndefined();
        expect(Memory.creeps['alive_creep']).toBeDefined();
    });
});
