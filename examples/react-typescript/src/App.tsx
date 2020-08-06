import React from "react";
import logo from "./assets/logo.svg";
import "./App.css";
import { usePulse } from "pulse-framework";
import core from "./core";

interface Global {
	[key: string]: any; // Add index signature
}
(globalThis as Global).core = core;

const App = () => {
	// usePulse to subscribe to Pulse state
	// const [dark, time, duration] = usePulse([core.state.DARK_THEME, core.state.THE_TIME]);

	return (
		<div className="App">
			<header className="App-header">
				<img src={logo} className="App-logo" alt="logo" />
				<a
					className="App-link"
					href="https://reactjs.org"
					target="_blank"
					rel="noopener noreferrer"
				>
					Pulse X React
				</a>
				{/* <p>{JSON.stringify(time)}</p> */}
				{/* <p className="small-text">{JSON.stringify(duration)}</p> */}
			</header>
		</div>
	);
};

export default App;
