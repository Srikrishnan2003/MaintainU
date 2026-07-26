"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Filter, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce"

export interface FilterOption {
    value: string
    label: string
}

export interface FilterConfig {
    key: string
    label: string
    type: "search" | "select" | "date"
    options?: FilterOption[]
    placeholder?: string
}

interface FilterBarProps {
    config: FilterConfig[]
}

export function FilterBar({ config }: FilterBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    
    // Find the search config if it exists
    const searchConfig = config.find(c => c.type === "search")
    
    // Local state for search to allow debouncing without lagging the input
    const [searchValue, setSearchValue] = useState(searchConfig ? searchParams.get(searchConfig.key) || "" : "")
    const debouncedSearch = useDebounce(searchValue, 300)

    // Helper to update the URL with new params
    const updateUrl = useCallback((key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (value && value !== "ALL") {
            params.set(key, value)
        } else {
            params.delete(key)
        }
        router.replace(`${pathname}?${params.toString()}`)
    }, [pathname, router, searchParams])

    // Effect to apply debounced search to URL
    useEffect(() => {
        if (searchConfig) {
            const currentUrlSearch = searchParams.get(searchConfig.key) || ""
            if (currentUrlSearch !== debouncedSearch) {
                updateUrl(searchConfig.key, debouncedSearch)
            }
        }
    }, [debouncedSearch, searchConfig, updateUrl, searchParams])

    // Update local search state if URL changes externally
    useEffect(() => {
        if (searchConfig) {
            const currentUrlSearch = searchParams.get(searchConfig.key) || ""
            if (currentUrlSearch !== debouncedSearch) {
                setSearchValue(currentUrlSearch)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const handleClearAll = () => {
        setSearchValue("")
        router.replace(pathname)
    }

    const hasActiveFilters = Array.from(searchParams.keys()).length > 0;

    return (
        <div className="flex flex-col gap-3 mt-2">
            {searchConfig && (
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search className="text-muted-foreground w-4 h-4" />
                    </div>
                    <Input
                        type="text"
                        placeholder={searchConfig.placeholder || "Search..."}
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 h-12 rounded-2xl border border-border/60 bg-muted/30 focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-medium shadow-sm"
                    />
                </div>
            )}
            
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide items-center">
                {config.filter(c => c.type === "select").map((filterItem) => {
                    const currentValue = searchParams.get(filterItem.key) || "ALL"
                    return (
                        <div key={filterItem.key} className="relative flex-shrink-0 group">
                            <select 
                                value={currentValue}
                                onChange={(e) => updateUrl(filterItem.key, e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-border/60 bg-card text-xs font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm max-w-[150px] truncate group-hover:border-primary/40 transition-colors cursor-pointer text-foreground"
                            >
                                <option value="ALL">ALL {filterItem.label}</option>
                                {filterItem.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                    )
                })}

            {config.filter(c => c.type === "date").map((filterItem) => {
                const currentValue = searchParams.get(filterItem.key) || ""
                return (
                    <div key={filterItem.key} className="relative flex-shrink-0">
                        <input
                            type="date"
                            value={currentValue}
                            onChange={(e) => updateUrl(filterItem.key, e.target.value)}
                            title={filterItem.label}
                            className="pl-3 pr-2 py-2 rounded-xl border border-border/60 bg-card text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm group-hover:border-primary/40 transition-colors cursor-pointer text-foreground"
                        />
                    </div>
                )
            })}

            {hasActiveFilters && (
                    <Button 
                        variant="ghost" 
                        onClick={handleClearAll}
                        className="text-xs h-8 px-3 rounded-xl text-muted-foreground hover:text-foreground font-bold"
                    >
                        <X className="w-3.5 h-3.5 mr-1.5" />
                        Clear All
                    </Button>
                )}
            </div>
        </div>
    )
}
