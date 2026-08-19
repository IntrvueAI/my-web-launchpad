import { useState } from 'react';
import { Check, ChevronsUpDown, School as SchoolIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useSchoolsData } from '@/hooks/useSchoolsData';
import { cn } from '@/lib/utils';

interface SchoolComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Searchable school picker — a dropdown over the ~320-school UK list (public/data/uk-schools-*.json)
 * rather than a native <select> (too many flat options to scan) or free text (typos, inconsistent
 * naming across a user's own school entries and the admin-side data). Falls back to accepting
 * whatever the user typed if it isn't in the list yet (the data file won't have every school), so
 * this never blocks someone from entering a real answer.
 */
export function SchoolCombobox({ value, onChange, placeholder = 'Select a school…', className }: SchoolComboboxProps) {
  const { schools } = useSchoolsData();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('justify-between font-normal', !value && 'text-muted-foreground', className)}
        >
          <span className="flex items-center gap-2 truncate">
            <SchoolIcon className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">{value || placeholder}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search schools…" value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded-sm"
                  onClick={() => { onChange(search.trim()); setOpen(false); setSearch(''); }}
                >
                  Use "{search.trim()}"
                </button>
              ) : (
                'No schools found.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {(schools ?? [])
                .filter((s) => {
                  const q = search.trim().toLowerCase();
                  if (!q) return true;
                  return s.name.toLowerCase().includes(q) || (s.region ?? '').toLowerCase().includes(q);
                })
                .slice(0, 50)
                .map((s) => (
                  <CommandItem
                    key={s.name}
                    value={s.name}
                    onSelect={() => { onChange(s.name); setOpen(false); setSearch(''); }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', value === s.name ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex flex-col">
                      <span>{s.name}</span>
                      {s.region && <span className="text-xs text-muted-foreground">{s.region}</span>}
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
