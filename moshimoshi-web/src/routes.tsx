import { Route, Switch } from "wouter";
import { Home } from "./pages/home";
import { MeetingsExamplePage } from "./pages/meetings/example";
import { MeetingsUuidPage } from "./pages/meetings/uuid";

export function Routes() {
	return (
		<Switch>
			<Route path="/" component={Home} />
			<Route path="/meetings/example" component={MeetingsExamplePage} />
			<Route path="/meetings/:uuid" component={MeetingsUuidPage} />
		</Switch>
	);
}
