import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
    (globalThis as any).OK = 0;
    (globalThis as any).ERR_NOT_IN_RANGE = -9;
    (globalThis as any).FIND_HOSTILE_CREEPS = 103;
    (globalThis as any).FIND_MY_CREEPS = 104;
    (globalThis as any).HEAL = 'heal';
    (globalThis as any).RANGED_ATTACK = 'ranged_attack';
    (globalThis as any).ATTACK = 'attack';
});

import { roleDefender } from '../src/roles/defender';

class MockRoomPosition {
    constructor(public x: number, public y: number, public roomName: string) {}
    isEqualTo(other: any) { return this.x === other.x && this.y === other.y; }
    findInRange() { return []; }
    findClosestByRange() { return null; }
    getRangeTo() { return 1; }
    inRangeTo() { return false; }
}
(globalThis as any).RoomPosition = MockRoomPosition;

describe('Role: Defender', () => {
    let mockCreep: any;
    let mockHostile: any;
    
    beforeEach(() => {
        vi.clearAllMocks();

        mockHostile = {
            id: 'enemy_1',
            owner: { username: 'Invader' },
            getActiveBodyparts: vi.fn().mockReturnValue(0),
            pos: {
                x: 25, y: 25, roomName: 'W1N1'
            }
        };

        mockCreep = {
            name: 'defender_test',
            memory: { role: 'defender', defendRoom: 'W1N1' },
            room: {
                name: 'W1N1',
                find: vi.fn().mockReturnValue([mockHostile])
            },
            pos: {
                findClosestByRange: vi.fn().mockReturnValue(mockHostile),
                getRangeTo: vi.fn().mockReturnValue(5),
                isEqualTo: vi.fn().mockReturnValue(false)
            },
            say: vi.fn(),
            moveTo: vi.fn(),
            attack: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE),
            rangedAttack: vi.fn().mockReturnValue((globalThis as any).ERR_NOT_IN_RANGE),
            heal: vi.fn(),
            getActiveBodyparts: vi.fn().mockReturnValue(0)
        };

        (globalThis as any).Game = {
            getObjectById: vi.fn().mockReturnValue(null),
            time: 100
        };
    });

    it('should move to the home room if not currently in it and no hostiles present', () => {
        mockCreep.room.name = 'W2N1'; // Outside home room
        mockCreep.memory.homeRoom = 'W1N1';
        mockCreep.room.find.mockReturnValue([]); // No hostiles

        roleDefender.run(mockCreep);
        
        expect(mockCreep.moveTo).toHaveBeenCalled();
        expect(mockCreep.say).not.toHaveBeenCalledWith('⚔️ ATTACK', true);
    });

    it('should attack a hostile creep in range', () => {
        mockCreep.pos.getRangeTo.mockReturnValue(1); // Next to it
        mockCreep.attack.mockReturnValue((globalThis as any).OK);
        
        roleDefender.run(mockCreep);
        
        expect(mockCreep.attack).toHaveBeenCalledWith(mockHostile);
        expect(mockCreep.say).toHaveBeenCalledWith('⚔️ ATTACK', true);
    });

    it('should set recycle flag when idle for more than 75 ticks', () => {
        mockCreep.room.find.mockReturnValue([]); // No hostiles
        mockCreep.pos.findClosestByRange.mockReturnValue(null);
        mockCreep.memory.idleTicks = 75;

        roleDefender.run(mockCreep);
        
        expect(mockCreep.memory.recycle).toBe(true);
        expect(mockCreep.say).toHaveBeenCalledWith('♻️ Recycle');
    });
});
