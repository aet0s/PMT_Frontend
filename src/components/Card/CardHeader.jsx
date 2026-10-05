import React from 'react';
import { usePermissions } from '../../context/PermissionContext';
import { LayoutGrid, MoreHorizontal, X, Archive, Copy, Trash2, ChevronDown } from 'lucide-react';
import { Menu, MenuItem, MenuGroup, MenuDivider } from '../ui/Menu';

export default function CardHeader({
  card,
  boardLists = [],
  onMoveList,
  onArchiveCard,
  onCopyCard,
  onDeleteCard,
  onClose
}) {
  const { hasPermission } = usePermissions();
  const canMoveCard = hasPermission('card.move');
  const canEditCard = hasPermission('card.edit');
  const canCreateCard = hasPermission('card.create');
  const canDeleteCard = hasPermission('card.delete');

  const currentList = boardLists.find((l) => l.id === card.list_id);

  return (
    <div className="flex items-center justify-between pb-3.5 border-b border-border select-none">
      {/* Left: Move to List Menu */}
      <div>
        {canMoveCard ? (
          <Menu
            placement="bottom-start"
            trigger={({ isOpen }) => (
              <button
                type="button"
                className={`flex items-center gap-2 px-3 py-1.5 bg-surface-muted hover:bg-border text-text-primary border border-border rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isOpen ? 'border-primary ring-1 ring-primary/30' : ''
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  in list{' '}
                  <strong className="text-text-primary font-semibold">
                    {currentList?.name || 'List'}
                  </strong>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>
            )}
          >
            <MenuGroup label="Move to List">
              {boardLists.map((l) => {
                const isSelected = l.id === card.list_id;
                return (
                  <MenuItem
                    key={l.id}
                    onClick={() => onMoveList(l.id)}
                    className={isSelected ? 'bg-primary-tint text-primary font-semibold' : ''}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{l.name}</span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                  </MenuItem>
                );
              })}
            </MenuGroup>
          </Menu>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-muted border border-border rounded-lg text-xs font-medium text-text-secondary">
            <LayoutGrid className="w-3.5 h-3.5 text-primary" />
            <span>
              in list{' '}
              <strong className="text-text-primary font-semibold">
                {currentList?.name || 'List'}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* Right: Actions Menu & Single Close X */}
      <div className="flex items-center gap-1.5">
        {(canEditCard || canCreateCard || canDeleteCard) && (
          <Menu
            placement="bottom-end"
            trigger={
              <button
                type="button"
                aria-label="Card actions"
                title="Card actions"
                className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            }
          >
            {canEditCard && (
              <MenuItem
                icon={<Archive className="w-4 h-4 text-warning" />}
                onClick={onArchiveCard}
              >
                Archive Card
              </MenuItem>
            )}
            {canCreateCard && (
              <MenuItem
                icon={<Copy className="w-4 h-4 text-primary" />}
                onClick={onCopyCard}
              >
                Copy Card
              </MenuItem>
            )}
            {canDeleteCard && (
              <>
                <MenuDivider />
                <MenuItem
                  icon={<Trash2 className="w-4 h-4 text-danger" />}
                  danger
                  onClick={onDeleteCard}
                >
                  Delete Card
                </MenuItem>
              </>
            )}
          </Menu>
        )}

        {/* Single integrated Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          title="Close dialog (Esc)"
          className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-muted transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
