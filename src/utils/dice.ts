/*
 * Portions of code in this file are originally from
 * https://github.com/ardittristan/VTTStreamUtils/blob/master/modules/diceSoNice.js
 * MIT License
 * Copyright (c) 2020 ardittristan
 */

import type { ReadyGame } from 'fvtt-types/configuration';
import { log } from './console.ts';
import { MODULE_ID as ID } from './const.js';
import { getSetting } from './settings.ts';

const color = getRandomColor();

export async function setupDiceSoNice() {
	if (!game || !(game as ReadyGame).user || !canvas) return;
	if ((game as ReadyGame).modules?.get('0streamutils')?.active) {
		console.warn(
			'OBS Utils | Stream Utils is installed, please disable it to use the DSN integration',
		);
		return;
	}

	if ((game as ReadyGame).modules?.get('dice-so-nice')?.active && getSetting('diceSoNice')) {
		log('OBS Utils | Creating dice so nice overlay');

		(game as ReadyGame).user.color = color;

		// @ts-expect-error Modifying Internals, no types available
		canvas?.tokens?.TokenRingConfig.initialize();

		// @ts-expect-error Modifying Internals, no types available
		(game as ReadyGame).user._origGetFlag = (game as ReadyGame).user.getFlag;
		(game as ReadyGame).user.getFlag = function (scope, key) {
			if (scope === 'dice-so-nice' && key === 'settings') {
				return {
					rollingArea: {
						left:
              (document?.querySelector('.overlay-renderer')?.getBoundingClientRect().width ?? 0) + 20,
						top: 0,
						width: (game as ReadyGame).settings.get(ID, 'diceSoNiceOverlayWidth'),
						height: (game as ReadyGame).settings.get(ID, 'diceSoNiceOverlayHeight'),
					},
				};
			}
			// @ts-expect-error Modifying Internals, no types available
			return this._origGetFlag(scope, key);
		};

		const boardContainer = document.createElement('div');
		const board = document.createElement('div');
		board.id = 'board';
		boardContainer.id = 'boardContainer';
		boardContainer.classList.add('obs-utils');
		boardContainer.style.display = 'none';
		boardContainer.appendChild(board);
		document.body.appendChild(boardContainer);
		// await canvas.initialize();
		// @ts-expect-error Modifying Internals, no types available
		// noinspection JSConstantReassignment
		canvas.primary = canvas.environment = {
			_backgroundColor: [0, 0, 0],
			colors: {
				// @ts-expect-error Modifying Internals, no types available
				ambientDarkness: { applyRGB: () => {} },
				// @ts-expect-error Modifying Internals, no types available
				ambientDaylight: { applyRGB: () => {} },
			},
		};
		// @ts-expect-error Modifying Internals, no types available
		// noinspection JSConstantReassignment
		canvas.app = new PIXI.Application({});

		Hooks.once('diceSoNiceInit', (dice3d: any) => {
			// @ts-expect-error Modifying Internals, no types available
			(game as ReadyGame).ready = false;
			main(dice3d.constructor);
			log('OBS Utils | Dice so Nice overlay initialized');
		});

		// Temporary workaround for odd dsn settings migration code
		// @ts-expect-error Modifying Internals, no types available
		(game as ReadyGame).ready = true;
		// @ts-expect-error Modifying Internals, no types available
		Hooks.events.ready
			.filter((hook: { fn: { toString: () => string | string[] } }) => hook.fn.toString().includes('new Dice3D'))[0]
			.fn
			.call();

		// @ts-expect-error Modifying Internals ignore typing
		ui.sidebar = {};
		// @ts-expect-error Modifying Internals, no types available
		ui.sidebar.popouts = {};
	}
}

function main(Dice3D: { prototype: { _buildCanvasOrig: any; _buildCanvas: () => void; showForRollOrig: any; showForRoll: (...args: any[]) => any; _welcomeMessage: () => void } }) {
	Dice3D.prototype._buildCanvasOrig = Dice3D.prototype._buildCanvas;
	Dice3D.prototype.showForRollOrig = Dice3D.prototype.showForRoll;

	Dice3D.prototype._buildCanvas = function () {
		this._buildCanvasOrig();
		// @ts-expect-error Modifying Internals ignore typing
		this.canvas.width(`${(game as ReadyGame | undefined)?.settings?.get(ID, 'diceSoNiceOverlayWidth')}px`);
		// @ts-expect-error Modifying Internals ignore typing
		this.canvas.height(`${(game as ReadyGame | undefined)?.settings?.get(ID, 'diceSoNiceOverlayHeight')}px`);
		// @ts-expect-error Modifying Internals ignore typing
		this.canvas.appendTo('.overlay-renderer');
	};

	Dice3D.prototype._welcomeMessage = function () {};

	Dice3D.prototype.showForRoll = function (...args) {
		args.forEach((arg) => {
			if (arg?.constructor?.name === 'User') {
				const color = getRandomColor();
				arg.color = arg.color || color;
				arg.getFlag = (id: string, flag: string) => arg.flags?.[id]?.[flag] || null;
			} else if (arg?.constructor?.name === 'ChatSpeakerData') {
				arg = null;
			}
		});
		return this.showForRollOrig(...args);
	};
}

function getRandomColor() {
	let color = '#';
	color += getRandomHex();
	color += getRandomHex(80);
	color += getRandomHex();
	return Color.fromString(color);
}

function getRandomHex(max = 255) {
	if (max < 0) max = 0;
	return Math.floor(Math.min(Math.random() * 16, max))
		.toString(16)
		.padStart(2, '0');
}
