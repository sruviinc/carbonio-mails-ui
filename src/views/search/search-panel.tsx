/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { FC, ReactElement, useEffect, useMemo, useState } from 'react';

import { Container, Padding, Text } from '@zextras/carbonio-design-system';
import { t } from '@zextras/carbonio-shell-ui';
import { useRouteMatch, Switch, Route } from 'react-router-dom';

import { EmptyFieldMessages, EmptyListMessages } from './utils';
import type { SearchPanelProps } from '../../types';
import { ConversationPreviewPanelContainer } from '../app/detail-panel/conversation-preview-panel-container';
import { MessagePreviewPanelContainer } from '../app/detail-panel/message-preview-panel-container';

const generateRandomNumber = (): number => Math.floor(Math.random() * 3);

const SearchPanel: FC<SearchPanelProps> = ({ searchResults, query }) => {
	const { path } = useRouteMatch();
	const emptyListMessages = useMemo(() => EmptyListMessages(t), []);
	const emptyFieldMessages = useMemo(() => EmptyFieldMessages(t), []);
	const [randomIndex, setRandomIndex] = useState(0);
	useEffect(() => {
		const random = generateRandomNumber();
		setRandomIndex(random);
	}, [searchResults?.conversations?.length, query]);
	const displayerMessage = useMemo(() => {
		if (!searchResults?.conversations) {
			return emptyListMessages[randomIndex];
		}
		return emptyFieldMessages[0];
	}, [searchResults?.conversations, emptyFieldMessages, emptyListMessages, randomIndex]);

	const displayerTitle = useMemo(() => displayerMessage?.title, [displayerMessage?.title]);
	const displayerDescription = useMemo(
		() => displayerMessage?.description,
		[displayerMessage?.description]
	);
	return (
		<Switch>
			<Route path={`${path}/folder/:folderId/conversation/:conversationId`}>
				<ConversationPreviewPanelContainer setClose={() => {}} />
			</Route>
			<Route path={`${path}/folder/:folderId/message/:messageId`}>
				<MessagePreviewPanelContainer />
			</Route>
			<Route
				path={path}
				render={(): ReactElement => (
					<Container background="white">
						<Padding all="medium">
							<Text
								color="gray1"
								overflow="break-word"
								weight="bold"
								size="large"
								style={{ whiteSpace: 'pre-line', textAlign: 'center' }}
							>
								{displayerTitle}
							</Text>
						</Padding>
						<Text
							size="small"
							color="gray1"
							overflow="break-word"
							style={{ whiteSpace: 'pre-line', textAlign: 'center' }}
						>
							{displayerDescription}
						</Text>
					</Container>
				)}
			/>
		</Switch>
	);
};

export default SearchPanel;
