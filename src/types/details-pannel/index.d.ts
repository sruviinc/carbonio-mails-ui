/*
 * SPDX-FileCopyrightText: 2022 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { NameSpace } from '@zextras/carbonio-shell-ui';

import { MailMessage } from '../messages';

type OpenEmlPreviewType = (
	parentMessageId: string,
	attachmentName: string,
	emlMessage: MailMessage
) => void;

export type MailEditHeaderType = {
	folderId: string | number;
	header: string | undefined;
};

export type IconColors = Array<{
	color: string;
	extension: string;
}>;

export type AttachmentType = {
	filename?: string;
	size: number;
	link: string;
	downloadlink: string;
	message: MailMessage;
	isExternalMessage?: boolean;
	part: string;
	iconColors: IconColors;
	att: EditorAttachmentFiles;
	openEmlPreview?: OpenEmlPreviewType;
};

export type PreviewPanelActionsType = {
	item: Conversation;
	folderId: string;
	isMessageView: boolean;
	conversation: Conversation;
};

export type CopyToFileRequest = {
	_jsns: NameSpace;
	mid: string;
	part: string;
	destinationFolderId: string;
};

export type CopyToFileResponse = {
	status?: string;
	value?: Record<string, unknown>;
};
