// client/src/pages/DevComponentsPage.jsx
import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Combobox,
  Menu,
  MenuItem,
  MenuDivider,
  MenuGroup,
  Popover,
  Checkbox,
  Switch,
  Badge,
  Avatar,
  AvatarGroup,
  Modal,
  Tooltip
} from '../components/ui';
import {
  User,
  Mail,
  Lock,
  Plus,
  Trash2,
  Settings,
  Shield,
  Check,
  AlertCircle,
  Folder,
  Sliders,
  MoreVertical
} from 'lucide-react';

export default function DevComponentsPage() {
  const [singleVal, setSingleVal] = useState('react');
  const [multiVal, setMultiVal] = useState(['react', 'tailwind']);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSelectVal, setModalSelectVal] = useState('option-1');

  const frameworkOptions = [
    { value: 'react', label: 'React', description: 'Component-based UI library' },
    { value: 'vue', label: 'Vue.js', description: 'Progressive JavaScript framework' },
    { value: 'svelte', label: 'Svelte', description: 'Cybernetically enhanced web apps' },
    { value: 'angular', label: 'Angular', description: 'Enterprise platform', disabled: true, disabledReason: 'Deprecated in this workspace' },
    { value: 'tailwind', label: 'Tailwind CSS', description: 'Utility-first CSS' }
  ];

  return (
    <div className="min-h-screen bg-app p-8 text-left space-y-10 select-none">
      <div>
        <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
          UI Component Catalog (/dev/components)
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Catalog of all design tokens, inputs, dropdowns, and primitives for visual regression and axe compliance testing.
        </p>
      </div>

      {/* 1. Buttons */}
      <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-text-primary">1. Buttons & IconButtons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">Primary Sm</Button>
          <Button variant="primary" size="md">Primary Md</Button>
          <Button variant="primary" size="lg">Primary Lg</Button>
          <Button variant="outline" size="md">Outline</Button>
          <Button variant="danger" size="md">Danger</Button>
          <Button variant="ghost" size="md">Ghost</Button>
          <Button variant="primary" size="md" isLoading>Loading</Button>
          <Button variant="primary" size="md" disabled>Disabled</Button>
          <IconButton icon={<Settings className="w-4 h-4" />} aria-label="Settings" />
          <IconButton icon={<Trash2 className="w-4 h-4" />} variant="danger" aria-label="Delete" />
        </div>
      </section>

      {/* 2. Form Inputs */}
      <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-text-primary">2. Inputs & Textarea</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Standard Input" placeholder="Type here..." id="dev-input-1" />
          <Input
            label="With Left Icon"
            placeholder="Search email..."
            leftIcon={<Mail className="w-4 h-4 text-text-secondary" />}
            id="dev-input-2"
          />
          <Input
            label="Error State"
            defaultValue="invalid-email"
            error="Please enter a valid work email"
            id="dev-input-3"
          />
          <Input label="Disabled State" disabled defaultValue="Read-only text" id="dev-input-4" />
          <div className="md:col-span-2">
            <Textarea label="Textarea Description" rows={2} placeholder="Enter details..." id="dev-textarea-1" />
          </div>
        </div>
      </section>

      {/* 3. New Global Floating Dropdown System */}
      <section className="bg-surface border border-border rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-text-primary">3. Global Dropdown System (@floating-ui/react)</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Single Select, Searchable Multi-Select Combobox, and Action Menu inside portals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Single Select */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-primary">Single Select</h3>
            <Select
              id="dev-select-single"
              label="Preferred Library"
              value={singleVal}
              onChange={setSingleVal}
              options={frameworkOptions}
              clearable
            />
            <p className="text-[11px] text-text-secondary">Selected: {singleVal}</p>
          </div>

          {/* Combobox (Multi) */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-primary">Searchable Multi-Select Combobox</h3>
            <Combobox
              id="dev-combobox-multi"
              label="Selected Technologies"
              multiple
              value={multiVal}
              onChange={setMultiVal}
              options={frameworkOptions}
            />
            <p className="text-[11px] text-text-secondary">Selected: {multiVal.join(', ')}</p>
          </div>

          {/* Menu */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-primary">Action Menu</h3>
            <div>
              <Menu
                trigger={
                  <Button variant="outline" size="md" rightIcon={<MoreVertical className="w-4 h-4" />}>
                    Workspace Options
                  </Button>
                }
              >
                <MenuGroup label="Manage">
                  <MenuItem icon={<Settings className="w-4 h-4" />}>Settings</MenuItem>
                  <MenuItem icon={<Shield className="w-4 h-4" />}>Permissions</MenuItem>
                </MenuGroup>
                <MenuDivider />
                <MenuItem icon={<Trash2 className="w-4 h-4" />} danger>
                  Delete Resource
                </MenuItem>
              </Menu>
            </div>
          </div>
        </div>

        {/* Dropdown inside a scrolling container to test flip, shift, and clipping prevention */}
        <div className="border border-border rounded-xl p-4 bg-app">
          <h3 className="text-xs font-bold text-text-primary mb-2">
            Dropdown inside Overflow Scrolling Container (Must never clip)
          </h3>
          <div className="h-32 overflow-y-scroll border border-border-strong rounded-lg p-3 bg-surface space-y-4">
            <p className="text-xs text-text-secondary">Scroll down inside this box to find the Select component:</p>
            <div className="h-16" />
            <Select
              id="dev-scrolling-select"
              label="Select in scrollbox"
              value={singleVal}
              onChange={setSingleVal}
              options={frameworkOptions}
            />
            <div className="h-32" />
          </div>
        </div>

        {/* Dropdown inside Modal */}
        <div>
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsModalOpen(true)}
            id="open-modal-dropdown-btn"
          >
            Test Dropdown Inside Modal
          </Button>

          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Dropdown Inside Modal Test"
          >
            <div className="space-y-4 py-2">
              <p className="text-xs text-text-secondary">
                This tests that FloatingPortal renders options on document.body above the modal backdrop and dialog (z-[900] &gt; z-50).
              </p>
              <Select
                id="dev-modal-select"
                label="Choose Option"
                value={modalSelectVal}
                onChange={setModalSelectVal}
                options={[
                  { value: 'option-1', label: 'First Choice' },
                  { value: 'option-2', label: 'Second Choice' },
                  { value: 'option-3', label: 'Third Choice' }
                ]}
              />
              <div className="flex justify-end pt-4">
                <Button variant="primary" size="md" onClick={() => setIsModalOpen(false)}>
                  Close Modal
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </section>

      {/* 4. Badges, Avatars & Tooltips */}
      <section className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-text-primary">4. Badges, Avatars & Toggles</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Avatar name="Sarah Connor" size="md" />
          <AvatarGroup
            avatars={[
              { name: 'Sarah Connor' },
              { name: 'John Connor' },
              { name: 'Kyle Reese' },
              { name: 'T-800' }
            ]}
            max={3}
          />
          <Tooltip content="Helpful tooltip text">
            <Button variant="ghost" size="sm">Hover for Tooltip</Button>
          </Tooltip>
        </div>
      </section>
    </div>
  );
}
