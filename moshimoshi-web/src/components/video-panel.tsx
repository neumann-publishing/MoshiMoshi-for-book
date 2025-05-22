import { Avatar, Flex, Progress } from "@chakra-ui/react";
import { type RefObject, useEffect } from "react";
import { When } from "react-if";

export function VideoPanel({
	videoRef,
	enableVideo,
	userName,
	soundVolume,
}: {
	videoRef: RefObject<HTMLVideoElement>;
	enableVideo: boolean;
	userName: string;
	soundVolume: number;
}) {
	return (
		<Flex width="100%" height="100%" flexDirection="column">
			<video
				ref={videoRef}
				width="460px"
				height="345px"
				autoPlay
				playsInline
				muted={true}
				controls={false}
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
					<Avatar name={userName} size="lg" />
				</Flex>
			</When>
			<Progress colorScheme="teal" size="xs" value={soundVolume} width="100%" />
		</Flex>
	);
}
