import { useEffect, useRef } from "react";

export function MeetingsExamplePage() {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		let stream: MediaStream | null = null;

		const getMedia = async () => {
			stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true,
			});
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
		};

		getMedia();

		return () => {
			// コンポーネントアンマウント時にストリームを停止
			if (stream) {
				for (const track of stream.getTracks()) {
					track.stop();
				}
			}
		};
	}, []);

	return (
		<video
			ref={videoRef}
			style={{ width: "480px", height: "360px", background: "#000" }}
			autoPlay
			playsInline
			muted
		/>
	);
}
