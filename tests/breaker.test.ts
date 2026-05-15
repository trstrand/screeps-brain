import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_STRUCTURES = 101;
    (globalThis as any).RESOURCE_POWER = 'power';
    (globalThis as any).RESOURCE_OPS = 'ops';
});

import { roleBreaker } from '../src/roles/breaker';

describe('Role: Breaker', () => {
    let mockCreep: any;
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockCreep = {
            name: 'breaker_test',
            memory: { role: 'breaker' },
            room: { name: 'W1N1' },
            pos: { findClosestByRange: vi.fn().mockReturnValue(null) },
            say: vi.fn(),
            moveTo: vi.fn(),
            dismantle: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE)
        };
        (globalThis as any).Game = { getObjectById: vi.fn().mockReturnValue(null) };
    });

    it('should render breaker run without throwing', () => {
        expect(() => roleBreaker.run(mockCreep)).not.toThrow();
    });
});
