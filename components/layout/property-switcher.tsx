'use client';

import { useProperty } from "@/components/providers/property-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Building2, Check, ChevronsUpDown } from "lucide-react";

export function PropertySwitcher() {
  const { currentProperty, properties, setProperty } = useProperty();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between h-12 rounded-xl bg-secondary/30 border-none hover:bg-secondary/50 transition-all text-sm font-medium"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <span className="truncate">{currentProperty?.name || "Select Property"}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      } />
      <DropdownMenuContent className="w-56 rounded-xl premium-card backdrop-blur-xl" align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
            Your Properties
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {properties.map((property) => (
            <DropdownMenuItem
              key={property.id}
              onClick={() => setProperty(property.id)}
              className="rounded-lg cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{property.name}</span>
              </div>
              {currentProperty?.id === property.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
