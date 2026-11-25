export const formatNumberedGroupLabel = (group, index, prefix = 'Group') => (
  `${index + 1}-${prefix} ${group}`
);

export const buildNumberedGroupOptions = (groups = [], prefix = 'Group') => (
  groups.map((group, index) => ({
    value: group,
    label: formatNumberedGroupLabel(group, index, prefix),
  }))
);
