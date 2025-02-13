/*
 * SPDX-FileCopyrightText: 2023 Zextras <https://www.zextras.com>
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import React, { useCallback, useEffect, useState } from 'react';

import { Button, Container, Padding, useSnackbar } from '@zextras/carbonio-design-system';
import { t } from '@zextras/carbonio-shell-ui';

import { RecipientsRow } from './recipients-row';
import { ParticipantRole } from '../../../../../carbonio-ui-commons/constants/participants';
import { getOrderedAccountIds } from '../../../../../carbonio-ui-commons/helpers/identities';
import { GapContainer } from '../../../../../commons/gap-container';
import { getIdentityDescriptor } from '../../../../../helpers/identities';
import {
	useEditorBccRecipients,
	useEditorCcRecipients,
	useEditorIdentityId,
	useEditorToRecipients
} from '../../../../../store/zustand/editor';
import { MailsEditorV2, Participant } from '../../../../../types';

export type RecipientsRowsProps = {
	editorId: MailsEditorV2['id'];
};

export const RecipientsRows = ({ editorId }: RecipientsRowsProps): React.JSX.Element => {
	const { toRecipients, setToRecipients } = useEditorToRecipients(editorId);
	const { ccRecipients, setCcRecipients } = useEditorCcRecipients(editorId);
	const { bccRecipients, setBccRecipients } = useEditorBccRecipients(editorId);

	const { identityId } = useEditorIdentityId(editorId);
	const [showCc, setShowCc] = useState(ccRecipients.length > 0);
	const [showBcc, setShowBcc] = useState(bccRecipients.length > 0);

	const toggleCc = useCallback(() => setShowCc((show) => !show), []);
	const toggleBcc = useCallback(() => setShowBcc((show) => !show), []);
	const [orderedAccountIds, setOrderedAccountIds] = useState<Array<string>>([]);
	const createSnackbar = useSnackbar();

	useEffect(() => {
		const selectedIdentity = getIdentityDescriptor(identityId);
		getOrderedAccountIds(selectedIdentity ? selectedIdentity.ownerAccount : '')
			.then((ids) => {
				setOrderedAccountIds(ids);
			})
			.catch(() => {
				createSnackbar({
					key: `ordered-account-ids`,
					replace: true,
					type: 'error',
					label: t('label.error_try_again', 'Something went wrong, please try again'),
					autoHideTimeout: 3000,
					hideButton: true
				});
			});
	}, [createSnackbar, identityId]);

	const onToChange = useCallback(
		(updatedRecipients: Array<Participant>) => setToRecipients(updatedRecipients),
		[setToRecipients]
	);

	const onCcChange = useCallback(
		(updatedRecipients: Array<Participant>) => setCcRecipients(updatedRecipients),
		[setCcRecipients]
	);

	const onBccChange = useCallback(
		(updatedRecipients: Array<Participant>) => setBccRecipients(updatedRecipients),
		[setBccRecipients]
	);

	return (
		<GapContainer gap={'small'}>
			<Container
				orientation="horizontal"
				background={'gray5'}
				style={{ overflow: 'hidden' }}
				padding={{ all: 'none' }}
			>
				<Container background={'gray5'} style={{ overflow: 'hidden' }}>
					<RecipientsRow
						type={ParticipantRole.TO}
						label={t('label.to', 'To')}
						dataTestid={'RecipientTo'}
						recipients={toRecipients}
						onRecipientsChange={onToChange}
						orderedAccountIds={orderedAccountIds}
					/>
				</Container>
				<Container
					width="fill"
					maxWidth="fit"
					background={'gray5'}
					padding={{ right: 'medium', left: 'extrasmall' }}
					orientation="horizontal"
				>
					<Padding right={'extrasmall'}>
						<Button
							label={t('label.cc', 'Cc')}
							type="ghost"
							style={{ color: '#282828' }} // FIXME create a styled component and use theme colors
							onClick={toggleCc}
							forceActive={showCc}
							data-testid="BtnCc"
						/>
					</Padding>
					<Button
						label={t('label.bcc', 'Bcc')}
						type="ghost"
						style={{ color: '#282828' }} // FIXME create a styled component and use theme colors
						forceActive={showBcc}
						onClick={toggleBcc}
					/>
				</Container>
			</Container>

			{showCc && (
				<RecipientsRow
					type={ParticipantRole.CARBON_COPY}
					label={t('label.cc', 'Cc')}
					dataTestid={'RecipientCc'}
					recipients={ccRecipients}
					onRecipientsChange={onCcChange}
					orderedAccountIds={orderedAccountIds}
				/>
			)}

			{showBcc && (
				<RecipientsRow
					type={ParticipantRole.BLIND_CARBON_COPY}
					label={t('label.bcc', 'Bcc')}
					dataTestid={'RecipientBcc'}
					recipients={bccRecipients}
					onRecipientsChange={onBccChange}
					orderedAccountIds={orderedAccountIds}
				/>
			)}
		</GapContainer>
	);
};
