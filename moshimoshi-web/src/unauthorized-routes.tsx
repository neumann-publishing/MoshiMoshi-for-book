import { Route, Switch } from "wouter";
import { SignInPage } from "./unauthorized-pages/sign-in";
import { SignUpPage } from "./unauthorized-pages/sign-up";

export function UnauthorizedRoutes() {
	return (
		<Switch>
			<Route path="/" component={SignInPage} />
			<Route path="/sign-up" component={SignUpPage} />
		</Switch>
	);
}
