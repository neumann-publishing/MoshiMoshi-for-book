export type User = {
	id: number;
	email: string;
	name?: string;
};

export type Meeting = {
	uuid: string;
	name: string;
	finishedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
	ownerId: number;
	ownerEmail: string;
	ownerName?: string;
};

export type MeetingWithPariticipants = {
	uuid: string;
	name: string;
	finishedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
	participants: {
		userId: number;
		userEmail: string;
		userName?: string;
		isOwner: boolean;
	}[];
};
