/*
 * SPDX-FileCopyrightText: 2021 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { FC, useEffect, useMemo, useState } from 'react';

import { Container, Padding, Text } from '@zextras/carbonio-design-system';
import { FOLDERS, t } from '@zextras/carbonio-shell-ui';
import { useParams } from 'react-router-dom';

import {
	DraftMessages,
	EmptyFieldMessages,
	EmptyListMessages,
	SentMessages,
	SpamMessages,
	TrashMessages
} from './utils';
import { getFolderIdParts } from '../../../helpers/folders';
import { useAppSelector } from '../../../hooks/redux';
import { selectConversationsArray } from '../../../store/conversations-slice';

const generateListRandomNumber = (): number => Math.floor(Math.random() * 3);
const generateFieldRandomNumber = (): number => Math.floor(Math.random() * 5);

export const SelectionInteractive: FC<{ count: number }> = ({ count }) => {
	const { folderId } = useParams<{ folderId: string }>();
	const conversations = useAppSelector(selectConversationsArray);
	const emptyListMessages = useMemo(() => EmptyListMessages(), []);
	const emptyFieldMessages = useMemo(() => EmptyFieldMessages(), []);
	const spamMessages = useMemo(() => SpamMessages(), []);
	const sentMessages = useMemo(() => SentMessages(), []);
	const draftMessages = useMemo(() => DraftMessages(), []);
	const trashMessages = useMemo(() => TrashMessages(), []);

	const [randomListIndex, setRandomListIndex] = useState(0);
	const [randomFieldIndex, setRandomFieldIndex] = useState(0);
	useEffect(() => {
		const random = generateListRandomNumber();
		setRandomListIndex(random);
	}, [folderId]);
	useEffect(() => {
		const random = generateFieldRandomNumber();
		setRandomFieldIndex(random);
	}, [folderId]);

	const displayerMessage = useMemo(() => {
		if (getFolderIdParts(folderId).id === FOLDERS.SPAM) {
			return conversations?.length > 0 ? spamMessages[1] : spamMessages[0];
		}
		if (getFolderIdParts(folderId).id === FOLDERS.SENT) {
			return conversations?.length > 0 ? sentMessages[1] : sentMessages[0];
		}
		if (getFolderIdParts(folderId).id === FOLDERS.DRAFTS) {
			return conversations?.length > 0 ? draftMessages[1] : draftMessages[0];
		}
		if (getFolderIdParts(folderId).id === FOLDERS.TRASH) {
			return conversations?.length > 0 ? trashMessages[1] : trashMessages[0];
		}
		return conversations && conversations.length > 0
			? emptyFieldMessages[randomFieldIndex]
			: emptyListMessages[randomListIndex];
	}, [
		conversations,
		emptyListMessages,
		emptyFieldMessages,
		randomListIndex,
		randomFieldIndex,
		folderId,
		spamMessages,
		sentMessages,
		draftMessages,
		trashMessages
	]);

	const textContentTitle = useMemo(
		() =>
			count > 0
				? t('label.mail_selected', {
						count,
						defaultValue_one: '{{count}} e-mail selected',
						defaultValue_other: '{{count}} e-mails selected'
					})
				: displayerMessage?.title,
		[count, displayerMessage?.title]
	);
	const textContentSubtitle = useMemo(
		() => (count > 0 ? null : displayerMessage?.description),
		[count, displayerMessage?.description]
	);

	return (
		<Container background="gray5" data-testid="selection-interactive">
			<Padding all="medium">
				<Text
					color="gray1"
					overflow="break-word"
					weight="bold"
					size="large"
					style={{ whiteSpace: 'pre-line', textAlign: 'center' }}
				>
					{textContentTitle}
				</Text>
			</Padding>
			<Text
				size="small"
				color="gray1"
				overflow="break-word"
				style={{ whiteSpace: 'pre-line', textAlign: 'center' }}
			>
				{textContentSubtitle}
			</Text>
		</Container>
	);
};
