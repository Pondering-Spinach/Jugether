import { Guest, User } from "../user/services";
import { getActivePartyId } from "./services";

export const requireHost = (req: Request) => User.getUserId(req);

export const getAccessiblePartyId = async (req: Request) => {
    if (await requireHost(req)) return getActivePartyId();
    return Guest.getPartyId(req);
};
