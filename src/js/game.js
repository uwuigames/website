
function createNewState(maxCompletedLevel) {
    const canvas = document.getElementById("game-canvas");
    const ctx = canvas.getContext("2d")
    maxCompletedLevel = maxCompletedLevel || 0;
    const availableLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    return {
        isDebug: window.location.search.indexOf("debug") !== -1,
        ctx,
        pageTitle: {
            text: "Select A Level",
            color: COLOR_PURPLE,
        },
        game: {
            phase: PHASE_0_LOBBY,
            maxCountDownFrames: 60,
            countDownFrames: 0,
            frame: 0,
            maxCompletedLevel,
            availableLevels,
            dataFPS: null,
            level: null,
            lastFrameTS: performance.now(),
            acceptControlCommands: false,
        },
        camera: {
            canvasW: null,
            canvasH: null,
            canvasHalfW: null,
            canvasHalfH: null,
        },
        plane: {
            asset: null,
            assets: [],
            dimensions: [],
            massKG: null,
            posMapCoord: null,
            attitude: null,
            thrust: null,
            minTouchdownVerticalMS: null,
            touchdownStats: {
                runwayUsedM: null,
                runwayWastedM: null,
                verticalMS: null,
                isSmooth: false,
                isRough: false,
                bounces: 0,
            },

            adjustPlanePosition: (state) => {},
            previousPoints: [],
            crashFrame: 0,
            touchedDown: false,
            halted: false,
            rwNegAccelerationMS: null,

            terminalHorizonalGlideSpeedsMS: [],
            horizontalGlideAccelerationCurves: [],
            terminalVerticalGlideSpeedsMS: [],
            verticalGlideAccelerationCurves: [],

            horizontalMS: null,
            verticalMS: null,
            isStalling: false,
            stallHorizonalMS: null,
            stallVerticalAccelerationMS: null,
            stallTerminalVerticalSpeedMS: null,
            climbMinHorizontalMS: null,
            climbTerminalVerticalSpeedMS: null,
            climbTerminalHorizontalSpeedMS: null,
            climbVerticalAccelerationCurve: null,
            climbHorizontalNegAccelerationCurve: null,
            climbHorizontalPosAccelerationCurve: null,
            levelFlightMinVelocitiesMS: [],

            instantaneousThrust: null,
            maxThrustingNewtons: null,
            currentThrustingNewtons: null,
            deltaNewtonPS: null,
        },
        map: {
            terrain: null,
            mapUnitsPerMeter: null,
            windXVel: null,
            windVolitility: null,
            windXMin: null,
            windXMax: null,
            windXTarg: null,
            rwP0MapCoord: null,
            rwP1MapCoord: null,
            gsP0MapCoord: null,
            gsP1MapCoord: null,
        },
        buttons: availableLevels.map(levelNumber => {
            const disabled = levelNumber > (maxCompletedLevel + 1);
            const btn = {
                type: BUTTON_TYPE_GRID,
                text: disabled ? '🔒' : `Level ${levelNumber}`,
                boxCoord: null,
                disabled,
                handler: disabled ? ()=>{} : () => {
                    window.addCommand({
                        cmd: "start-level",
                        args: [ levelNumber ],
                    });
                }
            };
            return btn;
        }),
    }
}

function orientButtons(state) {
    const gridBtns = [], mainBtns = [], ctrlBtns = [];
    state.buttons.forEach((btn, wix) => {
        if(btn.type === BUTTON_TYPE_CTRL) {
            ctrlBtns.push([btn, wix]);
        }
        else if(btn.type === BUTTON_TYPE_GRID) {
            gridBtns.push([btn, wix]);
        } else if(btn.type === BUTTON_TYPE_MAIN) {
            mainBtns.push([btn, wix]);
        } else {
            throw "not implemented";
        }
    });

    if(gridBtns.length) {
        const gridBtnsCount = gridBtns.length;
        const gridBtnMargin = 4;
        const gridBtnWidth = 125;
        const gridBtnHeight = 40;
        const gridBtnCol0XOffset = state.camera.canvasHalfW - (gridBtnWidth + gridBtnMargin)// 30;
        const gridBtnRow0YOffset = 70;
        let rowPointer = 0;
        let colPointer = 0;
        const gridMaxRows = Math.min(5, Math.floor(
            state.camera.canvasH - (gridBtnRow0YOffset * 2) / gridBtnHeight
        ));

        for(let i=0; i < gridBtnsCount; i++) {
            let [_btn, wix] = gridBtns[i];
            let btnX1 = gridBtnCol0XOffset + (colPointer * gridBtnWidth) + (gridBtnMargin * colPointer);
            let btnX2 = btnX1 + gridBtnWidth;
            let btnY1 = gridBtnRow0YOffset + (rowPointer * gridBtnHeight) + (gridBtnMargin * rowPointer);
            let btnY2 = btnY1 + gridBtnHeight;
            state.buttons[wix].boxCoord =  [[btnX1, btnY1], [btnX2, btnY2]]

            rowPointer++
            if(rowPointer >= gridMaxRows) {
                rowPointer = 0;
                colPointer++;
            }
        }
    }

    if(ctrlBtns.length) {
        const ctrlBtnsCount = ctrlBtns.length;
        const ctrlBtnHeight = Math.floor(state.camera.canvasH * 0.95 / ctrlBtnsCount);
        const ctrlBtnWidth = Math.min(state.camera.canvasW / 10, 60);
        let y1Pointer = 0;
        for(let i = 0; i < ctrlBtnsCount; i++) {
            let [_btn, wix] = ctrlBtns[i];

            if(state.buttons[wix].assetHref && !state.buttons[wix].asset) {
                state.buttons[wix].asset = new Image();
                state.buttons[wix].asset.src = state.buttons[wix].assetHref;
            }

            state.buttons[wix].boxCoord =  [
                [0, y1Pointer],
                [ctrlBtnWidth, y1Pointer + ctrlBtnHeight]
            ]
            y1Pointer += ctrlBtnHeight;
        }
    }

    if(mainBtns.length) {
        const mainBtnsCount = mainBtns.length;
        const mainBtnHeight = 38;
        const mainBtnWidth = 100;
        let x1Pointer = state.camera.canvasW - mainBtnWidth;
        for(let i = 0; i < mainBtnsCount; i++) {
            let [_btn, wix] = mainBtns[i];
            state.buttons[wix].boxCoord =  [
                [x1Pointer, 0],
                [x1Pointer + mainBtnWidth, mainBtnHeight]
            ];
            x1Pointer -= mainBtnWidth;
        }
    }

    return state;
}


function runDataLoop() {
    let state = window.readGameState();

    // Calculate FPS
    const nowTS = performance.now();
    const lastFrameTS = state.game.lastFrameTS;
    const diff = nowTS - lastFrameTS;
    const fps = 1000 / diff;
    state.game.lastFrameTS = nowTS;
    state.game.dataFPS = fps;

    // Position buttons and check for clicks
    state = orientButtons(state);
    const clickCanvasCoord = window.nextClick();
    if(clickCanvasCoord) {
        for(let i = 0; i < state.buttons.length; i++) {
            let clickInside = coordInsideBoxCoord(
                clickCanvasCoord,
                state.buttons[i].boxCoord,
            )
            if (clickInside) {
                state.buttons[i].handler();
                break;
            }
        }
    }

    if(state.game.phase === PHASE_2_LIVE) {
        let commands = [];
        while(true) {
            let cmd = window.nextCommand()
            if(cmd) {
                commands.push(cmd);
            } else {
                break;
            }
        }

        state.game.frame++;
        if(state.game.frame % 500 === 0) {
            console.log({ state });
        }

        // Process commands if not crashing
        if(!state.plane.crashFrame) {
            const cmdCt = commands.length;
            for(let i=0; i<cmdCt; i++) {
                let cmd = commands[i];
                if(cmd.cmd === "quit-level") {
                    window.setGameState(
                        updateStateCamera(
                            createNewState(state.game.maxCompletedLevel)
                        )
                    );
                    setTimeout(runDataLoop);
                    return;
                }
                else if(cmd.cmd === "set-attitude" && state.game.acceptControlCommands) {
                    state.plane.attitude = cmd.args[0];
                }
                else if(cmd.cmd === "set-thrust" && state.game.acceptControlCommands) {
                    state.plane.thrust = cmd.args[0];
                    if(state.plane.instantaneousThrust) {
                        state.plane.currentThrustingNewtons = (
                            state.plane.thrust
                            ? state.plane.maxThrustingNewtons
                            : 0
                        );

                    } else {
                        throw "Not Implemented";
                    }
                }
            }

        }
        else {
            state.plane.crashFrame++;
            if(state.plane.crashFrame > 200) {
                // Score screen
            }
        }

        // Adjust state for plane flying through the air
        if(!state.plane.touchedDown && !state.plane.crashFrame) {
            state = state.plane.adjustPlanePosition(state);
        }

        // check for ground contact and adjust state for plane
        // that is touching the ground.
        if(!state.plane.crashFrame && !state.plane.halted) {
            state = processGroundInteractions(state);
        }

        if(state.game.frame % (state.plane.thrust ?  12 : 25) === 0) {
            state.plane.previousPoints.unshift(
                deepCopy([state.plane.posMapCoord, state.plane.thrust])
            );
            state.plane.previousPoints = state.plane.previousPoints.slice(0, 30);
        }

        window.setGameState(state);

        const runtime = performance.now() - nowTS;
        const targetRuntimeMS = 16.667; // 60 FPS
        const timeout = Math.max(0, (targetRuntimeMS - runtime));
        setTimeout(runDataLoop, timeout);

        return;
    }

    // process commands
    const nextCmd = window.nextCommand();
    if(nextCmd) {
        if(
            nextCmd.cmd === "start-level"
            && state.game.phase === PHASE_0_LOBBY
        ) {
            state.game.phase = PHASE_1_COUNTDOWN;
            state.game.level = nextCmd.args[0];
            state.pageTitle = {
                text: "Get Ready!",
                color: COLOR_PURPLE,
            }
            state.buttons = [];
        }
    }

    // process count down
    if(state.game.phase === PHASE_1_COUNTDOWN) {
        state.game.countDownFrames++;
        if(state.game.countDownFrames >= state.game.maxCountDownFrames) {
            state.pageTitle = null;
            state.game.phase = PHASE_2_LIVE,
            state.game.acceptControlCommands = true;

            state = setPlaneProps(state);
            state = setMapProps(state);

            state.buttons = [{
                type: BUTTON_TYPE_MAIN,
                boxCoord: null,
                text: 'QUIT',
                handler: () => {
                    window.addCommand({
                        cmd: "quit-level",
                    });
                },
            }, {
                type: BUTTON_TYPE_CTRL,
                boxCoord: null,
                assetHref: "img/c152-2-t.svg",
                asset: null,
                selected: state => Boolean((state.plane.attitude === ATTITUDE_2) && state.plane.thrust),
                handler: () => {
                    window.addCommand({
                        cmd: "set-attitude",
                        args: [ 2 ],
                    });
                    window.addCommand({
                        cmd: "set-thrust",
                        args: [ true ],
                    });
                },
            }, {
                type: BUTTON_TYPE_CTRL,
                boxCoord: null,
                assetHref: "img/c152-2.svg",
                asset: null,
                selected: state => Boolean((state.plane.attitude === ATTITUDE_2) && !state.plane.thrust),
                handler: () => {
                    window.addCommand({
                        cmd: "set-attitude",
                        args: [ 2 ],
                    });
                    window.addCommand({
                        cmd: "set-thrust",
                        args: [ false ],
                    });
                },
            }, {
                type: BUTTON_TYPE_CTRL,
                boxCoord: null,
                assetHref: "img/c152-1.svg",
                asset: null,
                selected: state => Boolean((state.plane.attitude === ATTITUDE_1) && !state.plane.thrust),
                handler: () => {
                    window.addCommand({
                        cmd: "set-attitude",
                        args: [ 1 ],
                    });
                    window.addCommand({
                        cmd: "set-thrust",
                        args: [ false ],
                    });
                },
            }, {
                type: BUTTON_TYPE_CTRL,
                boxCoord: null,
                assetHref: "img/c152-0.svg",
                asset: null,
                selected: state => Boolean((state.plane.attitude === ATTITUDE_0) && !state.plane.thrust),
                handler: () => {
                    window.addCommand({
                        cmd: "set-attitude",
                        args: [ 0 ],
                    });
                    window.addCommand({
                        cmd: "set-thrust",
                        args: [ false ],
                    });
                },
            }];
        }
    }

    window.setGameState(state);

    const runtime = performance.now() - nowTS;
    const targetRuntimeMS = 16.667; // 60 FPS
    const timeout = Math.max(0, (targetRuntimeMS - runtime));
    setTimeout(runDataLoop, timeout);
    return;
}


function processGroundInteractions(state) {
    const plane = state.plane;
    if(plane.crashFrame) {
        throw "not implemented";
    }
    const fps = state.game.dataFPS;

    if(plane.touchedDown) {
        // Plane has touched down and negatively accelerating
        if(plane.horizontalMS > 0) {
            const deltaHVMF = plane.rwNegAccelerationMS / fps;
            const newHorizontalMS = Math.max(0, plane.horizontalMS - deltaHVMF)
            state.plane.horizontalMS = newHorizontalMS;
            if(newHorizontalMS > 0) {
                state.plane.posMapCoord[0] += (newHorizontalMS / fps);
                if(state.plane.posMapCoord[0] > state.map.rwP1MapCoord[0]) {
                    // Plane overan the runway
                    console.log("👉 overran runway");
                    state.plane.crashFrame++;
                }
            }
        } else {
            state.plane.halted = true;
        }
        return state;
    }

    const planeBottomMapCoordY = (
        state.plane.posMapCoord[1]
        - (
            state.plane.dimensions[state.plane.attitude][1] / 2
            * state.map.mapUnitsPerMeter
        )
    );
    const planeBottomDiffY = state.plane.posMapCoord[1] - planeBottomMapCoordY;
    const overRunway = Boolean(
        state.plane.posMapCoord[0] >= state.map.rwP0MapCoord[0]
        && state.plane.posMapCoord[0] <= state.map.rwP1MapCoord[0]
    );

    // Plane crashed into the ground
    if(!overRunway && planeBottomMapCoordY <= 0) {
        state.plane.crashFrame++;
        return state;
    }

    const touchingRunway = Boolean(
        overRunway
        && planeBottomMapCoordY <= state.map.rwP0MapCoord[1]
    );
    if(touchingRunway) {

        const touchdownMS = state.plane.verticalMS;
        const isCrash = touchdownMS < state.plane.minTouchdownVerticalMS
        const noBounceMin =  state.plane.minTouchdownVerticalMS * 0.333;
        const bigBounceMin = state.plane.minTouchdownVerticalMS * 0.666;

        // check for plane crash into runway
        if (isCrash || state.plane.attitude === ATTITUDE_0)
        {
            state.plane.crashFrame++;
        }
        else if(!isCrash && touchdownMS >= noBounceMin) {
            // touchdown
            state.plane.touchedDown = true;
            state.plane.verticalMS = 0;
            state.plane.posMapCoord[1] = state.map.rwP0MapCoord[1] + planeBottomDiffY;
            state.plane.touchdownStats.isSmooth = state.plane.touchdownStats.bounces === 0;
            state.plane.touchdownStats.verticalMS = touchdownMS;
            state.plane.touchdownStats.runwayWastedM = Math.round((
                plane.posMapCoord[0] - state.map.gsP1MapCoord[0]
            ) / state.map.mapUnitsPerMeter);
            console.log("👉 touch down");
            console.log(state.plane.touchdownStats);

        } else if (!isCrash && touchdownMS > bigBounceMin) {
            // small bounce off landing
            state.plane.verticalMS = Math.abs(state.plane.verticalMS) * 0.65;
            state.plane.touchdownStats.bounces++;
            console.log("👉 small bounce");

        } else {
            // big bounce off runway
            state.plane.verticalMS = Math.abs(state.plane.verticalMS) * 1.2;
            state.plane.touchdownStats.isRough = true;
            state.plane.touchdownStats.bounces++;
            console.log("👉 big bounce");
        }
    }

    return state;
}

