import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Additional searchable text that will be matched against but not displayed */
  searchableText?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  isLoading?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "เลือก...",
  searchPlaceholder = "ค้นหา...",
  emptyMessage = "ไม่พบข้อมูล",
  disabled = false,
  className,
  triggerClassName,
  isLoading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            triggerClassName
          )}
        >
          {isLoading ? (
            "กำลังโหลด..."
          ) : selectedOption ? (
            <span className="truncate">{selectedOption.label}</span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("w-[--radix-popover-trigger-width] p-0 z-[9999]", className)} 
        align="start"
        sideOffset={4}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="h-9"
          />
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                // Combine label, description, and searchableText for better filtering.
                // IMPORTANT: append option.value so duplicate labels stay unique in cmdk,
                // otherwise hover highlights all rows that share the same searchValue.
                const searchValue = [
                  option.label,
                  option.description,
                  option.searchableText,
                  option.value,
                ].filter(Boolean).join(" ");
                
                return (
                  <CommandItem
                    key={option.value}
                    value={searchValue}
                    keywords={option.searchableText ? [option.searchableText] : undefined}
                    disabled={option.disabled}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Multi-select version
interface SearchableMultiSelectProps {
  options: SearchableSelectOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  isLoading?: boolean;
  maxDisplay?: number;
}

export function SearchableMultiSelect({
  options,
  values,
  onValuesChange,
  placeholder = "เลือก...",
  searchPlaceholder = "ค้นหา...",
  emptyMessage = "ไม่พบข้อมูล",
  disabled = false,
  className,
  triggerClassName,
  isLoading = false,
  maxDisplay = 2,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedOptions = options.filter((option) => values.includes(option.value));

  const displayText = () => {
    if (selectedOptions.length === 0) return placeholder;
    if (selectedOptions.length <= maxDisplay) {
      return selectedOptions.map((o) => o.label).join(", ");
    }
    return `${selectedOptions.slice(0, maxDisplay).map((o) => o.label).join(", ")} +${selectedOptions.length - maxDisplay}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            values.length === 0 && "text-muted-foreground",
            triggerClassName
          )}
        >
          {isLoading ? (
            "กำลังโหลด..."
          ) : (
            <span className="truncate">{displayText()}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className={cn("w-[--radix-popover-trigger-width] p-0 z-[9999]", className)} 
        align="start"
        sideOffset={4}
      >
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="h-9"
          />
          <CommandList className="max-h-60">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = values.includes(option.value);
                // Combine label, description, and searchableText for better filtering.
                // Append option.value so duplicate labels remain unique in cmdk.
                const searchValue = [
                  option.label,
                  option.description,
                  option.searchableText,
                  option.value,
                ].filter(Boolean).join(" ");
                
                return (
                  <CommandItem
                    key={option.value}
                    value={searchValue}
                    keywords={option.searchableText ? [option.searchableText] : undefined}
                    disabled={option.disabled}
                    onSelect={() => {
                      if (isSelected) {
                        onValuesChange(values.filter((v) => v !== option.value));
                      } else {
                        onValuesChange([...values, option.value]);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
