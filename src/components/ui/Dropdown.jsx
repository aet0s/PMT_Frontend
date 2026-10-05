// client/src/components/ui/Dropdown.jsx
// Re-exporting from Menu to provide unified FloatingPortal floating dropdowns
import React from 'react';
import { Menu, MenuItem, MenuDivider, MenuGroup } from './Menu';

export const Dropdown = Menu;
export const DropdownItem = MenuItem;
export const DropdownDivider = MenuDivider;
export const DropdownGroup = MenuGroup;

export default Dropdown;
