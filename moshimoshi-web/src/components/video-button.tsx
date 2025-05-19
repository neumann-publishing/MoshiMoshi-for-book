import {
	ButtonGroup,
	Divider,
	Flex,
	Icon,
	IconButton,
	Popover,
	PopoverArrow,
	PopoverBody,
	PopoverContent,
	PopoverHeader,
	PopoverTrigger,
	Radio,
	RadioGroup,
	Switch,
	Text,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { ChangeEvent, RefObject, useEffect, useState } from "react";
import {
	MdArrowDropUp,
	MdOutlineVideocam,
	MdOutlineVideocamOff,
} from "react-icons/md";
import { Else, If, Then } from "react-if";
import { jwtTokenAtom } from "../atoms/current-user";
import {
	currentVideoDeviceIdAtom,
	enableBackgroundBlurAtom,
	enableVideoAtom,
} from "../atoms/media";
import { DeviceType, getDevices } from "../libs/devices";
import { httpClient } from "../libs/http-client";

export function VideoButton({
	videoTrackRef,
}: { videoTrackRef: RefObject<MediaStreamTrack | null> }) {
	const jwtToken = useAtomValue(jwtTokenAtom);
	const [enableVideo, setEnableVideo] = useAtom(enableVideoAtom);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [currentVideoDeviceId, setCurrentVideoDeviceId] = useAtom(
		currentVideoDeviceIdAtom,
	);
	const [enableBackgroundBlur, setEnableBackgroundBlur] = useAtom(
		enableBackgroundBlurAtom,
	);

	const { mutate, isPending } = useMutation({
		mutationFn: (data: { enable: boolean }) => {
			return httpClient({ jwtToken })
				.patch("auth/settings", {
					json: { target: "video", enable: data.enable },
				})
				.json();
		},
		onSuccess: (body: { enableVideo: boolean }) => {
			setEnableVideo(body.enableVideo);
			if (videoTrackRef.current) {
				videoTrackRef.current.enabled = body.enableVideo;
			}
		},
		onError: () => {
			alert("Failed to update video settings");
		},
	});

	const {
		mutate: updateCurrentVideoDeviceId,
		isPending: updateCurrentVideoDeviceIdIsPending,
	} = useMutation({
		mutationFn: (data: { currentVideoDeviceId: string }) => {
			return httpClient({ jwtToken })
				.patch("auth/settings/values", {
					json: data,
				})
				.json();
		},
		onSuccess: (body: { currentVideoDeviceId: string }) => {
			setCurrentVideoDeviceId(body.currentVideoDeviceId);
		},
		onError: () => {
			alert("Failed to update video settings");
		},
	});

	const onChangeCurrentVideoDeviceId = (value: string) => {
		updateCurrentVideoDeviceId({ currentVideoDeviceId: value });
	};

	const {
		mutate: updateEnableBackgroundBlur,
		isPending: updateEnableBackgroundBlurIsPending,
	} = useMutation({
		mutationFn: (data: { enableBackgroundBlur: boolean }) => {
			return httpClient({ jwtToken })
				.patch("auth/settings/values", {
					json: data,
				})
				.json();
		},
		onSuccess: (body: { enableBackgroundBlur: boolean }) => {
			setEnableBackgroundBlur(body.enableBackgroundBlur);
		},
		onError: () => {
			alert("Failed to update video settings");
		},
	});

	const onChangeEnableBackgroundBlur = (
		event: ChangeEvent<HTMLInputElement>,
	) => {
		const enable = event.target.checked;
		updateEnableBackgroundBlur({ enableBackgroundBlur: enable });
	};

	useEffect(() => {
		const promise = async () => {
			const devices = await getDevices(DeviceType.camera);
			setVideoDevices(devices);
		};

		promise();
	}, []);

	return (
		<ButtonGroup isAttached>
			<If condition={enableVideo}>
				<Then>
					<IconButton
						isRound={true}
						variant="solid"
						aria-label="Video Off"
						fontSize="20px"
						onClick={() => mutate({ enable: false })}
						isLoading={isPending}
						icon={<Icon as={MdOutlineVideocam} />}
					/>
				</Then>
				<Else>
					<IconButton
						isRound={true}
						variant="solid"
						aria-label="Video On"
						fontSize="20px"
						colorScheme="red"
						onClick={() => mutate({ enable: true })}
						isLoading={isPending}
						icon={<Icon as={MdOutlineVideocamOff} />}
					/>
				</Else>
			</If>
			<Popover placement="top">
				<PopoverTrigger>
					<IconButton
						isRound={true}
						aria-label="show select"
						icon={<Icon as={MdArrowDropUp} />}
					/>
				</PopoverTrigger>
				<PopoverContent width="350px">
					<PopoverHeader fontWeight="semibold">ビデオ設定</PopoverHeader>
					<PopoverArrow />
					<PopoverBody>
						<RadioGroup
							value={currentVideoDeviceId ?? videoDevices[0]?.deviceId}
							onChange={onChangeCurrentVideoDeviceId}
							isDisabled={updateCurrentVideoDeviceIdIsPending}
						>
							<Flex flexDirection="column">
								{videoDevices.map((device) => (
									<Radio key={device.deviceId} value={device.deviceId}>
										{device.label}
									</Radio>
								))}
							</Flex>
						</RadioGroup>
						<Divider margin="5px 0" />
						<Flex justifyContent="space-between">
							<Text>背景ぼかし</Text>
							<Switch
								id="enableBackgroundBlur"
								isChecked={enableBackgroundBlur}
								onChange={onChangeEnableBackgroundBlur}
								isDisabled={updateEnableBackgroundBlurIsPending}
							/>
						</Flex>
					</PopoverBody>
				</PopoverContent>
			</Popover>
		</ButtonGroup>
	);
}
