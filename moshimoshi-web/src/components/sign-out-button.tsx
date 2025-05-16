import { Button } from "@chakra-ui/react";
import { useSetAtom } from "jotai";
import Cookies from "js-cookie";
import { currentUserAtom, jwtTokenAtom } from "../atoms/current-user";

export function SignOutButton() {
	const setJwtToken = useSetAtom(jwtTokenAtom);
	const setCurrentUser = useSetAtom(currentUserAtom);
	const onClick = () => {
		setJwtToken(undefined);
		setCurrentUser(undefined);
		Cookies.remove("jwt-token");
	};

	return (
		<Button type="button" onClick={onClick}>
			サインアウト
		</Button>
	);
}
