import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TagDto } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { generateRandomTagColor } from "@/lib/tag-colors";
import { createTag, searchTags } from "@/lib/backend";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";

type TagMultiSelectProps = {
  allTags: TagDto[];
  selectedIds: number[];
  onChange: (tagIds: number[]) => void;
  onTagCreated?: (tag: TagDto) => void;
  placeholder?: string;
};

function normalizeTagName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function TagMultiSelect({
  allTags,
  selectedIds,
  onChange,
  onTagCreated,
  placeholder = "Buscar etiquetas...",
}: TagMultiSelectProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: searchPage, isFetching } = useQuery({
    queryKey: ["tags-search", search],
    enabled: open,
    queryFn: () => searchTags({ search, limit: 20 }),
  });

  const selectedTags = useMemo(
    () => allTags.filter((tag) => selectedIds.includes(tag.id)),
    [allTags, selectedIds],
  );

  const selectedPublicTagId = selectedTags.find((tag) => tag.isPublic)?.id ?? null;
  const normalizedSearch = normalizeTagName(search);

  const options = useMemo(() => {
    const base = search.trim()
      ? searchPage?.data ?? []
      : [...allTags]
          .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
          .slice(0, 20);

    const merged = new Map<number, TagDto>();
    [...selectedTags, ...base].forEach((tag) => {
      merged.set(tag.id, tag);
    });

    return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [allTags, search, searchPage?.data, selectedTags]);

  const canCreate = normalizedSearch.length > 0
    && !options.some((tag) => normalizeTagName(tag.name) === normalizedSearch);

  function toggleTag(tag: TagDto) {
    const selected = selectedIds.includes(tag.id);

    if (!selected && tag.isPublic && selectedPublicTagId && selectedPublicTagId !== tag.id) {
      toast({
        title: "Somente uma etiqueta publica por produto.",
        description: "Remova a etiqueta publica atual antes de selecionar outra.",
        variant: "destructive",
      });
      return;
    }

    onChange(
      selected
        ? selectedIds.filter((id) => id !== tag.id)
        : [...selectedIds, tag.id],
    );
  }

  async function handleCreateTag() {
    const trimmed = search.trim().replace(/\s+/g, " ");
    if (!trimmed) return;

    setCreating(true);
    try {
      const created = await createTag({
        name: trimmed,
        color: generateRandomTagColor(),
        isPublic: false,
      });

      onTagCreated?.(created);
      onChange([...selectedIds, created.id]);
      setSearch("");
      setOpen(false);
      toast({ title: `Etiqueta "${created.name}" criada e vinculada.` });
    } catch (error) {
      toast({
        title: "Erro ao criar etiqueta",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-background"
          >
            <span className="truncate text-left">
              {selectedTags.length > 0
                ? `${selectedTags.length} etiqueta${selectedTags.length > 1 ? "s" : ""} selecionada${selectedTags.length > 1 ? "s" : ""}`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder={placeholder}
            />
            <CommandList>
              <CommandEmpty>
                {isFetching ? "Buscando etiquetas..." : "Nenhuma etiqueta encontrada."}
              </CommandEmpty>
              <CommandGroup>
                {canCreate ? (
                  <CommandItem onSelect={() => void handleCreateTag()} disabled={creating}>
                    <Plus className="h-4 w-4 text-primary" />
                    <span>Criar "{search.trim()}"</span>
                  </CommandItem>
                ) : null}

                {options.map((tag) => {
                  const selected = selectedIds.includes(tag.id);
                  const publicTagBlocked = !selected && tag.isPublic && selectedPublicTagId && selectedPublicTagId !== tag.id;

                  return (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => toggleTag(tag)}
                      disabled={Boolean(publicTagBlocked)}
                    >
                      <Check className={`h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                      <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: tag.color }} />
                      <span className="flex-1 truncate" style={{ color: tag.color }}>
                        {tag.name}
                      </span>
                      {tag.isPublic ? (
                        <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">
                          Site
                        </span>
                      ) : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              className="gap-1 rounded-full px-2 py-1"
              style={{ borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}12` }}
            >
              {tag.name}
              {tag.isPublic ? <span className="text-[10px] uppercase">site</span> : null}
              <button
                type="button"
                className="inline-flex h-4 w-4 items-center justify-center rounded-full"
                onClick={() => onChange(selectedIds.filter((id) => id !== tag.id))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
