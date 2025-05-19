import { Avatar, Flex, Progress } from "@chakra-ui/react";
import { useAtomValue } from "jotai";
import { RefObject } from "react";
import { When } from "react-if";
import { currentUserAtom } from "../atoms/current-user";
import { enableVideoAtom, microphoneVolumeFilteredAtom } from "../atoms/media";

export function MyVideoPanel({
	videoRef,
}: {
	videoRef: RefObject<HTMLVideoElement>;
}) {
	const microphoneVolumeFiltered = useAtomValue(microphoneVolumeFilteredAtom);
	const enableVideo = useAtomValue(enableVideoAtom);
	const currentUser = useAtomValue(currentUserAtom);

	return (
		<Flex width="100%" height="100%" flexDirection="column">
			<video
				ref={videoRef}
				width="460px"
				height="345px"
				autoPlay
				muted
				style={{ display: enableVideo ? "block" : "none" }}
			/>

			<When condition={!enableVideo}>
				<Flex
					width="460px"
					height="345px"
					bgColor="lightgray"
					justifyContent="center"
					alignItems="center"
				>
					<Avatar name={currentUser.name || currentUser.email} size="lg" />
				</Flex>
			</When>
			<Progress
				colorScheme="teal"
				size="xs"
				value={microphoneVolumeFiltered}
				width="100%"
			/>
		</Flex>
	);
}
