import { Types } from 'mongoose';

export interface TestUser {
	id: string;
	name: string;
	role?: string;
	banned?: boolean;
}

export const makeUser = (name: string, extra: Partial<TestUser> = {}): TestUser => ({
	id: new Types.ObjectId().toHexString(),
	name,
	role: 'user',
	banned: false,
	...extra,
});

/** Header that the mocked Better Auth session lookup reads the signed-in user from. */
export const as = (user: TestUser) => ({ 'x-test-user': JSON.stringify(user) });
