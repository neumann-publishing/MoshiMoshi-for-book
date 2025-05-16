import { ChakraProvider } from "@chakra-ui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";

const queryClient = new QueryClient();

// biome-ignore lint/style/noNonNullAssertion: no problem with this
createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ChakraProvider>
			<QueryClientProvider client={queryClient}>
				<App />
			</QueryClientProvider>
		</ChakraProvider>
	</StrictMode>,
);
