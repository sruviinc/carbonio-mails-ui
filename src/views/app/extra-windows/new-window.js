/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * MIT License
 *
 * Copyright (c) 2017 Rubens Mariuzzo
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * 	The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * 	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Component dependencies.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';

/**
 * Make keyframe rules.
 * @param {CSSRule} cssRule
 * @return {String}
 * @private
 */

function getKeyFrameText(cssRule) {
	const tokens = ['@keyframes', cssRule.name, '{'];
	Array.from(cssRule.cssRules).forEach((rule) => {
		// type === CSSRule.KEYFRAME_RULE should always be true
		tokens.push(rule.keyText, '{', rule.style.cssText, '}');
	});
	tokens.push('}');
	return tokens.join(' ');
}

/**
 * Handle local import urls.
 * @param {CSSRule} cssRule
 * @return {String}
 * @private
 */

function fixUrlForRule(cssRule) {
	return cssRule.cssText
		.split('url(')
		.map((line) => {
			if (line[1] === '/') {
				return `${line.slice(0, 1)}${window.location.origin}${line.slice(1)}`;
			}
			return line;
		})
		.join('url(');
}

/**
 * Convert features props to window features format (name=value,other=value).
 * @param {Object} obj
 * @return {String}
 * @private
 */

function toWindowFeatures(obj) {
	return Object.keys(obj)
		.reduce((features, name) => {
			const value = obj[name];
			if (typeof value === 'boolean') {
				features.push(`${name}=${value ? 'yes' : 'no'}`);
			} else {
				features.push(`${name}=${value}`);
			}
			return features;
		}, [])
		.join(',');
}

/**
 * Copy styles from a source document to a target.
 * @param {Object} source
 * @param {Object} target
 * @private
 */
function copyStyles(source, target) {
	// Store style tags, avoid reflow in the loop
	const headFrag = target.createDocumentFragment();

	Array.from(source.styleSheets).forEach((styleSheet) => {
		// For <style> elements
		let rules;
		try {
			rules = styleSheet.cssRules;
		} catch (err) {
			console.error(err);
		}

		if (rules) {
			// IE11 is very slow for appendChild, so use plain string here
			const ruleText = [];

			// Write the text of each rule into the body of the style element
			Array.from(styleSheet.cssRules).forEach((cssRule) => {
				const { type } = cssRule;

				// Skip unknown rules
				if (type === CSSRule.UNKNOWN_RULE) {
					return;
				}

				let returnText;

				if (type === CSSRule.KEYFRAMES_RULE) {
					// IE11 will throw error when trying to access cssText property, so we
					// need to assemble them
					returnText = getKeyFrameText(cssRule);
				} else if ([CSSRule.IMPORT_RULE, CSSRule.FONT_FACE_RULE].includes(type)) {
					// Check if the cssRule type is CSSImportRule (3) or CSSFontFaceRule (5)
					// to handle local imports on a about:blank page
					// '/custom.css' turns to 'http://my-site.com/custom.css'
					returnText = fixUrlForRule(cssRule);
				} else {
					returnText = cssRule.cssText;
				}
				ruleText.push(returnText);
			});

			const newStyleEl = target.createElement('style');
			newStyleEl.textContent = ruleText.join('\n');
			headFrag.appendChild(newStyleEl);
		} else if (styleSheet.href) {
			// for <link> elements loading CSS from a URL
			const newLinkEl = target.createElement('link');

			newLinkEl.rel = 'stylesheet';
			newLinkEl.href = styleSheet.href;
			headFrag.appendChild(newLinkEl);
		}
	});

	target.head.appendChild(headFrag);
}

/**
 * Replace completely the styles in the target document
 * using a fresh copy from the styles of the source document
 * @param source
 * @param target
 */
function replaceStyles(source, target) {
	// Remove all existing styles
	const elements = target.head.getElementsByTagName('style');
	while (elements[0]) elements[0].parentNode.removeChild(elements[0]);

	copyStyles(source, target);
}

/**
 * The NewWindow class object.
 * @public
 */

class NewWindow extends React.PureComponent {
	/**
	 * NewWindow default props.
	 */
	static defaultProps = {
		url: '',
		name: '',
		title: '',
		features: { width: '600px', height: '640px' },
		onBlock: null,
		onOpen: null,
		onUnload: null,
		center: 'parent',
		copyStyles: true,
		closeOnUnmount: true
	};

	/**
	 * The NewWindow function constructor.
	 * @param {Object} props
	 */
	constructor(props) {
		super(props);
		this.container = null;
		this.window = null;
		this.windowCheckerInterval = null;
		this.released = false;
		this.state = {
			mounted: false
		};
	}

	/**
	 * Render the NewWindow component.
	 */
	render() {
		if (!this.state.mounted) return null;
		return ReactDOM.createPortal(this.props.children, this.container);
	}

	componentDidMount() {
		// In React 18, componentDidMount gets called twice
		// causing openChild to get called twice
		if (!this.window && !this.container) {
			this.openChild();
			// this.setState({ mounted: true });
		}
	}

	/**
	 * Create the new window when NewWindow component mount.
	 */
	openChild() {
		const { url, title, name, features, onBlock, onOpen, center } = this.props;

		// Prepare position of the new window to be centered against the 'parent' window or 'screen'.
		if (
			typeof center === 'string' &&
			(features.width === undefined || features.height === undefined)
		) {
			console.warn(
				'width and height window features must be present when a center prop is provided'
			);
		} else if (center === 'parent') {
			features.left = window.top.outerWidth / 2 + window.top.screenX - features.width / 2;
			features.top = window.top.outerHeight / 2 + window.top.screenY - features.height / 2;
		} else if (center === 'screen') {
			const screenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screen.left;
			const screenTop = window.screenTop !== undefined ? window.screenTop : window.screen.top;

			// eslint-disable-next-line no-nested-ternary
			const width = window.innerWidth
				? window.innerWidth
				: document.documentElement.clientWidth
					? document.documentElement.clientWidth
					: window.screen.width;
			// eslint-disable-next-line no-nested-ternary
			const height = window.innerHeight
				? window.innerHeight
				: document.documentElement.clientHeight
					? document.documentElement.clientHeight
					: window.screen.height;

			features.left = width / 2 - features.width / 2 + screenLeft;
			features.top = height / 2 - features.height / 2 + screenTop;
		}

		// Open a new window.

		this.window = window.open(url, name, toWindowFeatures(features));

		// When a new window use content from a cross-origin there's no way we can attach event
		// to it. Therefore, we need to detect in a interval when the new window was destroyed
		// or was closed.
		this.windowCheckerInterval = setInterval(() => {
			if (!this.window || this.window.closed) {
				this.release();
			}
		}, 50);

		// Check if the new window was successfully opened.
		if (this.window) {
			this.window.document.title = title;

			// Check if the container already exists as the window may have been already open
			this.container = this.window.document.getElementById('new-window-container');
			if (this.container === null) {
				this.container = this.window.document.createElement('div');
				this.container.setAttribute('id', 'new-window-container');
				this.window.document.body.appendChild(this.container);
			} else {
				// Remove any existing content
				const staticContainer = this.window.document.getElementById('new-window-container-static');
				this.window.document.body.removeChild(staticContainer);
			}

			// If specified, copy styles from parent window's document.
			if (this.props.copyStyles) {
				setTimeout(() => copyStyles(document, this.window.document), 0);
			}

			if (typeof onOpen === 'function') {
				onOpen(this.window);
			}

			// Release anything bound to this component before the new window unload.
			this.window.addEventListener('beforeunload', () => this.release());
			this.setState({ mounted: true });
		} else {
			// Handle error on opening of new window.
			// eslint-disable-next-line no-lonely-if
			if (typeof onBlock === 'function') {
				onBlock(null);
			} else {
				console.warn('A new window could not be opened. Maybe it was blocked.');
			}
		}
	}

	/**
	 * Closes the opened window (if any) when NewWindow will unmount if the
	 * prop {closeOnUnmount} is true, otherwise the NewWindow will remain open
	 */
	componentWillUnmount() {
		// With React 18, componentWillUnmount gets called twice
		// so only call componentWillUnmount when the `mounted` state
		// is set
		if (this.state.mounted && this.window) {
			if (this.props.closeOnUnmount) {
				this.window.close();
			} else if (this.props.children) {
				// Clone any children so they aren't removed when react stops rendering
				const clone = this.container.cloneNode(true);
				clone.setAttribute('id', 'new-window-container-static');
				this.window.document.body.appendChild(clone);
			}
		}
	}

	/**
	 * Release the new window and anything that was bound to it.
	 */
	release() {
		// This method can be called once.
		if (this.released) {
			return;
		}
		this.released = true;

		// Remove checker interval.
		clearInterval(this.windowCheckerInterval);

		// Call any function bound to the `onUnload` prop.
		const { onUnload } = this.props;

		if (typeof onUnload === 'function') {
			onUnload(null);
		}
	}
}

NewWindow.propTypes = {
	children: PropTypes.node,
	url: PropTypes.string,
	name: PropTypes.string,
	title: PropTypes.string,
	features: PropTypes.object,
	onUnload: PropTypes.func,
	onBlock: PropTypes.func,
	onOpen: PropTypes.func,
	center: PropTypes.oneOf(['parent', 'screen']),
	copyStyles: PropTypes.bool,
	closeOnUnmount: PropTypes.bool
};

/**
 * Utility functions.
 * @private
 */

/**
 * Component export.
 * @private
 */

export default NewWindow;
export { copyStyles, replaceStyles };
