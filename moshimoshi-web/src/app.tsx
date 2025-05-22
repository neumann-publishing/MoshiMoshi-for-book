import { Flex, Spinner } from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { useVisibilityChange } from "@uidotdev/usehooks";
import dayjs from "dayjs";
import { useAtom, useSetAtom } from "jotai";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { useEffect } from "react";
import { useTimer } from "react-timer-hook";
import { currentUserAtom, jwtTokenAtom } from "./atoms/current-user";
import {
	currentAudioDeviceIdAtom,
	currentSpeakerDeviceIdAtom,
	currentVideoDeviceIdAtom,
	enableBackgroundBlurAtom,
	enableMicrophoneAtom,
	enableNoiseCancellationAtom,
	enableSpeakerAtom,
	enableVideoAtom,
	microphoneUnderGainAtom,
} from "./atoms/media";
import { httpClient } from "./libs/http-client";
import { Routes } from "./routes";
import type { User, UserSetting } from "./types";
import { UnauthorizedRoutes } from "./unauthorized-routes";

export function App() {
	const documentVisible = useVisibilityChange();
	const [jwtToken, setJwtToken] = useAtom(jwtTokenAtom);
	const [currentUser, setCurrentUser] = useAtom(currentUserAtom);
	const setEnableVideo = useSetAtom(enableVideoAtom);
	const setEnableMicrophone = useSetAtom(enableMicrophoneAtom);
	const setEnableSpeaker = useSetAtom(enableSpeakerAtom);
	const setEnableNoiseCancellation = useSetAtom(enableNoiseCancellationAtom);
	const setMicrophoneUnderGain = useSetAtom(microphoneUnderGainAtom);
	const setCurrentAudioDeviceId = useSetAtom(currentAudioDeviceIdAtom);
	const setCurrentVideoDeviceId = useSetAtom(currentVideoDeviceIdAtom);
	const setCurrentSpeakerDeviceId = useSetAtom(currentSpeakerDeviceIdAtom);
	const setEnableBackgroundBlurAtom = useSetAtom(enableBackgroundBlurAtom);

	const { mutate, isPending } = useMutation({
		mutationFn: () => {
			return httpClient({ jwtToken }).get("auth/current-user").json();
		},
		onSuccess: (body: { user: User; userSetting: UserSetting }) => {
			setCurrentUser(body.user);
			setEnableVideo(body.userSetting.enableVideo);
			setEnableMicrophone(body.userSetting.enableMicrophone);
			setEnableSpeaker(body.userSetting.enableSpeaker);
			setEnableNoiseCancellation(body.userSetting.enableNoiseCancellation);
			setMicrophoneUnderGain(body.userSetting.microphoneUnderGain);
			setCurrentAudioDeviceId(body.userSetting.currentAudioDeviceId);
			setCurrentVideoDeviceId(body.userSetting.currentVideoDeviceId);
			setCurrentSpeakerDeviceId(body.userSetting.currentSpeakerDeviceId);
			setEnableBackgroundBlurAtom(body.userSetting.enableBackgroundBlur);
		},
		onError: () => {
			setJwtToken(undefined);
			setCurrentUser(undefined);
			Cookies.remove("jwt-token");
		},
	});
	const reSignIn = () => {
		const cookieJwtToken = Cookies.get("jwt-token");
		if (cookieJwtToken == null) {
			setJwtToken(undefined);
			setCurrentUser(undefined);
			return;
		}

		const decoded = jwtDecode(cookieJwtToken);
		if (dayjs.unix(decoded.exp).isBefore(dayjs())) {
			setJwtToken(undefined);
			setCurrentUser(undefined);
			Cookies.remove("jwt-token");
			return;
		}

		setJwtToken(cookieJwtToken);
		mutate();
	};

	const { restart } = useTimer({
		expiryTimestamp: dayjs().add(30, "minutes").toDate(),
		onExpire: reSignIn,
	});

	// 画面表示時に再ログイン（主にリロードしたとき）
	useEffect(reSignIn, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies(restart): setter
	useEffect(() => {
		if (!documentVisible) {
			// 画面を表示しなくなって 30 分経過したら再ログインを試みる
			restart(dayjs().add(30, "minutes").toDate());
		}
	}, [documentVisible]);

	if (isPending) {
		return (
			<Flex
				justifyContent="center"
				alignItems="flex-end"
				height="100px"
				width="100%"
			>
				<Spinner />
			</Flex>
		);
	}

	if (currentUser == null) {
		return <UnauthorizedRoutes />;
	}

	return <Routes />;
}
