import {
  BaseTag,
  Body,
  Box,
  ButtonLink,
  Caption,
  CaptionMono,
  Colors,
  Icon,
  Popover,
  Tooltip,
} from '@dagster-io/ui';
import groupBy from 'lodash/groupBy';
import isEqual from 'lodash/isEqual';
import React from 'react';
import {Link} from 'react-router-dom';

import {displayNameForAssetKey, LiveDataForNode} from '../asset-graph/Utils';
import {AssetNodeKeyFragment} from '../asset-graph/types/AssetNode.types';
import {AssetKeyInput, StaleCauseCategory, StaleStatus} from '../graphql/types';

import {assetDetailsPathForKey} from './assetDetailsPathForKey';

export const isAssetMissing = (liveData?: LiveDataForNode) =>
  liveData && liveData.staleStatus === StaleStatus.MISSING;

export const isAssetStale = (liveData?: LiveDataForNode) =>
  liveData && liveData.staleStatus === StaleStatus.STALE;

const NO_CAUSES = 'No reasons available.';

const LABELS = {
  self: {
    [StaleCauseCategory.CODE]: 'Code version',
    [StaleCauseCategory.DATA]: 'Data version',
    [StaleCauseCategory.DEPENDENCIES]: 'Dependencies',
  },
  upstream: {
    [StaleCauseCategory.CODE]: 'Upstream code version',
    [StaleCauseCategory.DATA]: 'Upstream data',
    [StaleCauseCategory.DEPENDENCIES]: 'Upstream dependencies',
  },
};

export const StaleReasonsLabel: React.FC<{
  assetKey: AssetKeyInput;
  include: 'all' | 'upstream' | 'self';
  liveData?: LiveDataForNode;
}> = ({liveData, include, assetKey}) => {
  if (!isAssetStale(liveData) || !liveData?.staleCauses.length) {
    return null;
  }

  return (
    <Body color={Colors.Yellow700}>
      <Tooltip position="top" content={<StaleCausesSummary causes={liveData.staleCauses} />}>
        {Object.keys(groupedCauses(assetKey, include, liveData)).join(', ')}
      </Tooltip>
    </Body>
  );
};

export const StaleReasonsTags: React.FC<{
  assetKey: AssetKeyInput;
  include: 'all' | 'upstream' | 'self';
  liveData?: LiveDataForNode;
  onClick?: () => void;
}> = ({liveData, include, assetKey, onClick}) => {
  if (!isAssetStale(liveData) || !liveData?.staleCauses.length) {
    return null;
  }

  return (
    <>
      {Object.entries(groupedCauses(assetKey, include, liveData)).map(([label, causes]) => (
        <Popover
          key={label}
          content={<StaleCausesSummary causes={causes} />}
          position="top"
          interactionKind="hover"
          className="chunk-popover-target"
        >
          <BaseTag
            fillColor={Colors.Yellow50}
            textColor={Colors.Yellow700}
            interactive={!!onClick}
            icon={<Icon name="changes_present" color={Colors.Yellow700} />}
            label={
              onClick ? (
                <ButtonLink underline="never" onClick={onClick} color={Colors.Yellow700}>
                  {label}
                </ButtonLink>
              ) : (
                label
              )
            }
          />
        </Popover>
      ))}
    </>
  );
};

function groupedCauses(
  assetKey: AssetKeyInput,
  include: 'all' | 'upstream' | 'self',
  liveData?: LiveDataForNode,
) {
  const all = (liveData?.staleCauses || [])
    .map((cause) => {
      const target = isEqual(assetKey.path, cause.key.path) ? 'self' : 'upstream';
      return {...cause, target, label: LABELS[target][cause.category]};
    })
    .filter((cause) => include === 'all' || include === cause.target);

  return groupBy(all, (cause) => cause.label);
}

export const StaleCausesInfoDot: React.FC<{causes: LiveDataForNode['staleCauses']}> = ({
  causes,
}) => (
  <Popover
    content={causes && causes.length > 0 ? <StaleCausesSummary causes={causes} /> : NO_CAUSES}
    position="top"
    interactionKind="hover"
    className="chunk-popover-target"
  >
    <Icon name="info" size={12} color={Colors.Yellow700} />
  </Popover>
);

const StaleCausesSummary: React.FC<{causes: LiveDataForNode['staleCauses']}> = ({causes}) => (
  <Box style={{width: '300px'}}>
    <Box
      padding={12}
      border={{side: 'bottom', width: 1, color: Colors.KeylineGray}}
      style={{fontWeight: 600}}
    >
      Changes since last materialization:
    </Box>
    <Box style={{maxHeight: '240px', overflowY: 'auto'}} onClick={(e) => e.stopPropagation()}>
      {causes.map((cause, idx) => (
        <Box
          key={idx}
          border={idx > 0 ? {side: 'top', width: 1, color: Colors.KeylineGray} : null}
          padding={{vertical: 8, horizontal: 12}}
        >
          <Link to={assetDetailsPathForKey(cause.key)}>
            <CaptionMono>{displayNameForAssetKey(cause.key)}</CaptionMono>
          </Link>
          <StaleReason reason={cause.reason} dependency={cause.dependency} />
        </Box>
      ))}
    </Box>
  </Box>
);

const StaleReason: React.FC<{reason: string; dependency: AssetNodeKeyFragment | null}> = ({
  reason,
  dependency,
}) => {
  if (!dependency) {
    return <Caption>{` ${reason}`}</Caption>;
  }

  const dependencyName = displayNameForAssetKey(dependency);
  const dependencyPythonName = dependencyName.replace(/ /g, '');
  if (reason.endsWith(`${dependencyPythonName}`)) {
    const reasonUpToDep = reason.slice(0, -dependencyPythonName.length);
    return (
      <Caption>
        {` ${reasonUpToDep}`}
        <Link to={assetDetailsPathForKey(dependency)}>{dependencyName}</Link>
      </Caption>
    );
  }

  return (
    <Caption>
      {` ${reason} `}(<Link to={assetDetailsPathForKey(dependency)}>{dependencyName}</Link>)
    </Caption>
  );
};
