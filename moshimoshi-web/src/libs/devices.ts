export enum DeviceType {
	microphone = "audioinput",
	speaker = "audiooutput",
	camera = "videoinput",
}

export async function getDevices(type: DeviceType) {
	const devices = await navigator.mediaDevices.enumerateDevices();
	return devices.filter((device) => device.kind === type);
}
