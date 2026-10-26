import { IconName } from '@shared/ui/icon/icon';

export interface NavItem {
  label: string;
  route: string;
  icon: IconName;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    label: 'Signature',
    items: [{ label: 'Demandes de signature', route: '/requests', icon: 'file-signature' }],
  },
];
