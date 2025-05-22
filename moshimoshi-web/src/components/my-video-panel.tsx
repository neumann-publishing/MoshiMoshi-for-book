import { useAtomValue } from "jotai";
import type { RefObject } from "react";
import { currentUserAtom } from "../atoms/current-user";
import { enableVideoAtom, microphoneVolumeFilteredAtom } from "../atoms/media";
import { VideoPanel } from "./video-panel";

export function MyVideoPanel({
	videoRef,
}: {
	videoRef: RefObject<HTMLVideoElement>;
}) {
	const microphoneVolumeFiltered = useAtomValue(microphoneVolumeFilteredAtom);
	const enableVideo = useAtomValue(enableVideoAtom);
	const currentUser = useAtomValue(currentUserAtom);

	return (
		<VideoPanel
			videoRef={videoRef}
			enableVideo={enableVideo}
			userName={currentUser.name}
			soundVolume={microphoneVolumeFiltered}
		/>
	);
}
