
function innerAdjustPlanePosition(state) {
    state.plane.isStalling = false;
    state.game.acceptControlCommands = true;

    const fps = state.game.dataFPS;
    const plane = state.plane;
    const horizontalMF = plane.horizontalMS / fps;
    const verticalMF = plane.verticalMS / fps;
    const frameStallV = plane.stallHorizonalMS / fps;

    let frameDeltaXPosMeters;
    let newHorizontalMS;
    let frameDeltaYPosMeters;
    let newVerticalMS;
    if(horizontalMF < frameStallV) {

        state.plane.isStalling = true;
        state.game.acceptControlCommands = false;
        state.plane.attitude = ATTITUDE_2;

        newHorizontalMS = plane.horizontalMS;
        frameDeltaYPosMeters = plane.stallVerticalAccelerationMS / fps;
        newVerticalMS = Math.max(
            plane.stallTerminalVerticalSpeedMS,
            plane.verticalMS + frameDeltaYPosMeters,
        );
    }
    else if (plane.attitude === ATTITUDE_0) {
        // Plane is nose down, accelerating
        // +horizontally and -vertically.
        const att = ATTITUDE_0;
        const termDeltaXMS = plane.terminalHorizonalGlideSpeedsMS[att];
        const horizontalGlideAccCurve = plane.horizontalGlideAccelerationCurves[att];
        const xAccMS =  horizontalGlideAccCurve(plane.horizontalMS);
        const xAccMF = xAccMS / fps;
        newHorizontalMS = Math.min(
            termDeltaXMS,
            plane.horizontalMS + xAccMF
        )

        const termDeltaYMS = plane.terminalVerticalGlideSpeedsMS[att];
        const verticalGlideAccelerationCurve = plane.verticalGlideAccelerationCurves[att];
        const yAccMS = verticalGlideAccelerationCurve(plane.horizontalMS);
        const yAccMF = yAccMS / fps;
        newVerticalMS = Math.max(
            plane.verticalMS + yAccMF,
            termDeltaYMS,
        )
    }
    else if (plane.attitude === ATTITUDE_1) {
        // accelerate +/-horizontally and +/-vertically
        // to terminal glide speeds
        const att = ATTITUDE_1;

        const termDeltaXMS = plane.terminalHorizonalGlideSpeedsMS[att];
        const termDeltaXMF = termDeltaXMS / fps;
        if(horizontalMF < termDeltaXMF) {
            // +horizontal acceleration to term
            const xAccMS = 3.4;
            const xAccMF = xAccMS / fps;
            newHorizontalMS = Math.min(
                termDeltaXMS,
                plane.horizontalMS + xAccMF
            );
        } else if(horizontalMF > termDeltaXMF) {
            // -horizontal acceleration to term
            const horizontalGlideAccCurve = plane.horizontalGlideAccelerationCurves[att];
            const xAccMS =  horizontalGlideAccCurve(plane.horizontalMS);
            const xAccMF = xAccMS / fps;
            newHorizontalMS = Math.max(
                termDeltaXMS,
                plane.horizontalMS + xAccMF
            );
        } else {
            newHorizontalMS = plane.horizontalMS;
        }

        const levelFlightMinMF = plane.levelFlightMinVelocitiesMS[att] / fps;
        const isLevelFlight = horizontalMF >= levelFlightMinMF;
        if(isLevelFlight) {
            newVerticalMS = 0;
        } else {
            const termDeltaYMS = plane.terminalVerticalGlideSpeedsMS[att];
            const termDeltaYMF = termDeltaYMS / fps;
            if(verticalMF < termDeltaYMF) {
                // Slow down descent to terminal glide speed
                const yAccMS = 1.5;
                const yAccMF = yAccMS / fps;
                newVerticalMS = Math.min(
                    termDeltaYMS,
                    plane.verticalMS + yAccMF
                );
            }
            else if (verticalMF > termDeltaYMF) {
                // speed up descent to terminal glide speed
                const verticalGlideAccelerationCurve = plane.verticalGlideAccelerationCurves[att];
                const yAccMS = verticalGlideAccelerationCurve(plane.horizontalMS);
                const yAccMF = yAccMS / fps;
                newVerticalMS = Math.max(
                    termDeltaYMS,
                    plane.verticalMS + yAccMF
                );
            }
            else {
                newVerticalMS = plane.verticalMS;
            }
        }
    }
    else if(plane.attitude === ATTITUDE_2) {
        // Nose up
        const att = 2;

        const termDeltaXMS = plane.terminalHorizonalGlideSpeedsMS[att];
        const termDeltaXMF = termDeltaXMS / fps;
        const termDeltaXClimbMS = plane.climbTerminalHorizontalSpeedMS;
        const termDeltaXClimbMF = termDeltaXClimbMS / fps;

        if(horizontalMF > termDeltaXMF && !plane.thrust) {
            // -horizontal acc
            const termDeltaXMS = plane.terminalHorizonalGlideSpeedsMS[att];
            const horizontalGlideAccelerationCurve = plane.horizontalGlideAccelerationCurves[att];
            const xAccMS = horizontalGlideAccelerationCurve(plane.horizontalMS);
            const xAccMF = xAccMS / fps;
            newHorizontalMS = Math.max(
                termDeltaXMS,
                plane.horizontalMS + xAccMF
            );
        }
        else if (horizontalMF <= termDeltaXMF && !plane.thrust){
            // zero horizontal acceleration
            newHorizontalMS = plane.horizontalMS;
        }
        else if (horizontalMF < termDeltaXClimbMF && plane.thrust) {
            // +horizontal acc
            const xAccMS = plane.climbHorizontalPosAccelerationCurve(plane.horizontalMS);
            const xAccMF = xAccMS / fps;
            newHorizontalMS = Math.min(
                termDeltaXClimbMS,
                plane.horizontalMS + xAccMF
            );
        }
        else if (horizontalMF > termDeltaXClimbMF && plane.thrust) {
            // -horizontal acc
            const xAccMS = plane.climbHorizontalNegAccelerationCurve(plane.horizontalMS);
            const xAccMF = xAccMS / fps;
            newHorizontalMS = Math.max(
                termDeltaXClimbMS,
                plane.horizontalMS + xAccMF
            );
        } else if (horizontalMF === termDeltaXClimbMF && plane.thrust) {
            newHorizontalMS = termDeltaXClimbMS;
        }
        else {
            throw NOT_IMPLEMENTED;
        }

        const climbMinMF = plane.climbMinHorizontalMS / fps;
        const levelFlightMinMF = plane.levelFlightMinVelocitiesMS[att] / fps;
        if(horizontalMF < levelFlightMinMF) {
            // descent
            const termDeltaYMS = plane.terminalVerticalGlideSpeedsMS[att];
            const verticalGlideAccelerationCurve = plane.verticalGlideAccelerationCurves[att];
            const yAccMS = verticalGlideAccelerationCurve(plane.horizontalMS);
            const yAccMF = yAccMS / fps;
            newVerticalMS = Math.max(
                termDeltaYMS,
                plane.verticalMS + yAccMF
            );
        }
        else if (horizontalMF >= levelFlightMinMF && horizontalMF < climbMinMF) {
            // level flight
            newVerticalMS = 0;
        }
        else if(horizontalMF >= climbMinMF) {
            // climb
            const termDeltaYMS = plane.climbTerminalVerticalSpeedMS;
            const yAccMS =  Math.max(0, plane.climbVerticalAccelerationCurve(plane.horizontalMS));
            const yAccMF = yAccMS / fps;
            newVerticalMS = Math.min(
                termDeltaYMS,
                plane.verticalMS + yAccMF,
            );
        }
        else {
            throw NOT_IMPLEMENTED
        }
    }
    else {
        throw NOT_IMPLEMENTED;
    }

    state.plane.horizontalMS = newHorizontalMS;
    state.plane.verticalMS = newVerticalMS;
    state.plane.posMapCoord[0] += (
        newHorizontalMS * state.map.mapUnitsPerMeter / fps
    );
    state.plane.posMapCoord[1] += (
        newVerticalMS * state.map.mapUnitsPerMeter / fps
    );

    return state;
}

function feetPerMinToMS(fpm) {
    // feet per minute to meters per second
    return fpm / 60 / 3
}

function knotsToMS(k) {
    // knots to meters per second
    return k / 2;
}

function mPSToKnots(ms) {
    // Meters per second to knots
    return ms * 2;
}

function setPlaneProps(state) {
    if(!state.game.level) {
        throw new Error("level not set");
    }
    if(state.game.level < 6) {
        state.plane.asset = PLANE_C152;
        state.plane.thrust = false;
        state.plane.dimensions = [],
        state.plane.rwNegAccelerationMS = knotsToMS(-6);
        state.plane.minTouchdownVerticalMS = feetPerMinToMS(-750)
        state.plane.adjustPlanePosition = innerAdjustPlanePosition;

        state.plane.horizontalMS = knotsToMS(58);
        state.plane.verticalMS = 0;

        state.plane.instantaneousThrust = true;
        state.plane.maxThrustingNewtons = 225;
        state.plane.currentThrustingNewtons = 0;
        state.plane.deltaNewtonPS = null;

        state.plane.stallHorizonalMS = knotsToMS(29);
        state.plane.stallTerminalVerticalSpeedMS = feetPerMinToMS(-10000);
        state.plane.stallVerticalAccelerationMS = -15

        state.plane.climbMinHorizontalMS = knotsToMS(60);
        state.plane.climbTerminalVerticalSpeedMS = feetPerMinToMS(1200);
        state.plane.climbTerminalHorizontalSpeedMS = knotsToMS(65);
        state.plane.climbVerticalAccelerationCurve = xMS => -1 * xMS + knotsToMS(72);
        state.plane.climbHorizontalPosAccelerationCurve = xMS => 4;
        state.plane.climbHorizontalNegAccelerationCurve = xMS => -8;

        state.plane.levelFlightMinVelocitiesMS = [
            null, // No level flight for attitude 0
            knotsToMS(54),
            knotsToMS(47),
        ];

        state.plane.terminalHorizonalGlideSpeedsMS = [
            knotsToMS(72),
            knotsToMS(48),
            knotsToMS(28),
        ];
        state.plane.horizontalGlideAccelerationCurves = [
            xMS => knotsToMS(Math.pow(mPSToKnots(xMS), 2) * 0.005),
            xMS => knotsToMS(-1 * Math.pow(mPSToKnots(xMS), 2) * 0.002),
            xMS => knotsToMS(-1 * Math.pow(mPSToKnots(xMS), 2) * 0.008),
        ];

        state.plane.terminalVerticalGlideSpeedsMS = [
            feetPerMinToMS(-3000),
            feetPerMinToMS(-1800),
            feetPerMinToMS(-800),
        ];

        state.plane.verticalGlideAccelerationCurves = [
            (xMS) => {
                return knotsToMS(-1 * Math.pow(mPSToKnots(xMS), 2) * 0.003);
            },
            (xMS) => {
                return knotsToMS(-1 * Math.pow(mPSToKnots(xMS), 2) * 0.0018);
            },
            (xMS) => {
                const k = mPSToKnots(xMS);
                if(k <= 53) {
                    return knotsToMS(-1 * Math.pow(k, 2) * 0.0006);
                } else {
                    return knotsToMS(-1.5 * k + 77.82);
                }
            },
        ]

        const noFlareAsset = new Image();
        noFlareAsset.src = "img/" + PLANE_C152 + "-1.svg";
        const flareAsset = new Image();
        flareAsset.src = "img/" + PLANE_C152 + "-2.svg";
        state.plane.assets.push(
            noFlareAsset,
            flareAsset,
        );

        state.plane.dimensions.push(
            [6.0, 2],     // no flare (nose level)
            [5.95, 2.05], // flare    (nose us)
        );

    }
    return state;
}

function setMapProps(state) {
    const mupm = 25
    state.map.mapUnitsPerMeter = 25;
    const level = state.game.level;
    if(level < 4) {
        state.map.terrain = TERRAIN_FOREST;
        state.map.rwP0MapCoord = [1000 * mupm, 0];
        state.map.rwP1MapCoord = [1500 * mupm, 0];
        state.map.gsP0MapCoord = [0, 200 * mupm];
        state.map.gsP1MapCoord = [1010 * mupm, 0];
        state.plane.posMapCoord = deepCopy(state.map.gsP0MapCoord);
        if(level == 1) {
            state.map.windXVel = 0;
            state.map.windVolitility = 0.05;
            state.map.windXMin = -4;
            state.map.windXMax = 4;
            state.map.windXTarg = 0;
        } else if (level == 2) {
            throw NOT_IMPLEMENTED;
        } else if(level == 3) {
            throw NOT_IMPLEMENTED;
        }
    } else if(level < 7) {
        state.map.terrain = TERRAIN_DESERT;
        throw NOT_IMPLEMENTED;
    } else {
        state.map.terrain = TERRAIN_OCEAN;
        throw NOT_IMPLEMENTED;
    }
    return state;
}
