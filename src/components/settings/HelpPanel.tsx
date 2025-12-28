import { useState, useMemo } from "react";
import { Search, ChevronRight, ArrowLeft, X, Info } from "lucide-react";
import { SlidePanel } from "../ui/SlidePanel";
import {
  helpSections,
  searchHelp,
  HelpSection,
  HelpContent,
} from "../../data/helpContent";

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
}

export function HelpPanel({ open, onClose }: HelpPanelProps) {
  const [activeSection, setActiveSection] = useState<HelpSection | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = useMemo(() => {
    return searchHelp(searchQuery);
  }, [searchQuery]);

  const handleBack = () => {
    setActiveSection(null);
  };

  const handleClose = () => {
    setActiveSection(null);
    setSearchQuery("");
    onClose();
  };

  const handleSelectSection = (section: HelpSection) => {
    setActiveSection(section);
    setSearchQuery("");
  };

  const title = activeSection ? (
    <div className="flex items-center gap-2">
      <button
        onClick={handleBack}
        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-150 cursor-pointer"
        aria-label="Takaisin"
      >
        <ArrowLeft size={18} />
      </button>
      <span className="text-body font-medium text-foreground">
        {activeSection.title}
      </span>
    </div>
  ) : (
    <span className="text-body font-medium text-foreground">Käyttöohje</span>
  );

  return (
    <SlidePanel open={open} onClose={handleClose} title={title}>
      {activeSection ? (
        <SectionContent section={activeSection} />
      ) : (
        <MainView
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchResults={searchResults}
          onSelectSection={handleSelectSection}
        />
      )}
    </SlidePanel>
  );
}

// Main view with search and section list
interface MainViewProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: { section: HelpSection; matchedText: string }[];
  onSelectSection: (section: HelpSection) => void;
}

function MainView({
  searchQuery,
  onSearchChange,
  searchResults,
  onSelectSection,
}: MainViewProps) {
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-border-subtle">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Hae ohjeista..."
            autoComplete="one-time-code"
            className="w-full pl-9 pr-8 py-2 text-body bg-card border border-border-subtle rounded-md input-focus"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <SearchResults results={searchResults} onSelect={onSelectSection} />
        ) : (
          <SectionList onSelect={onSelectSection} />
        )}
      </div>
    </div>
  );
}

// Section list
interface SectionListProps {
  onSelect: (section: HelpSection) => void;
}

function SectionList({ onSelect }: SectionListProps) {
  return (
    <div className="p-2">
      {helpSections.map((section, index) => (
        <button
          key={section.id}
          onClick={() => onSelect(section)}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-card-hover transition-colors duration-150 cursor-pointer text-left animate-fade-in"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className="min-w-0">
            <div className="text-body font-medium text-foreground">
              {section.title}
            </div>
            <div className="text-caption text-muted-foreground mt-0.5">
              {section.description}
            </div>
          </div>
          <ChevronRight
            size={16}
            className="flex-shrink-0 text-muted-foreground ml-2"
          />
        </button>
      ))}
    </div>
  );
}

// Search results
interface SearchResultsProps {
  results: { section: HelpSection; matchedText: string }[];
  onSelect: (section: HelpSection) => void;
}

function SearchResults({ results, onSelect }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <Search size={32} className="text-muted-foreground mb-3" />
        <p className="text-body text-muted-foreground">Ei hakutuloksia</p>
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="px-3 py-2 text-caption text-muted-foreground">
        {results.length} {results.length === 1 ? "tulos" : "tulosta"}
      </div>
      {results.map(({ section, matchedText }, index) => (
        <button
          key={section.id}
          onClick={() => onSelect(section)}
          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-card-hover transition-colors duration-150 cursor-pointer text-left animate-fade-in"
          style={{ animationDelay: `${index * 30}ms` }}
        >
          <div className="min-w-0">
            <div className="text-body font-medium text-foreground">
              {section.title}
            </div>
            <div className="text-caption text-muted-foreground mt-0.5 truncate">
              {matchedText}
            </div>
          </div>
          <ChevronRight
            size={16}
            className="flex-shrink-0 text-muted-foreground ml-2"
          />
        </button>
      ))}
    </div>
  );
}

// Section content view
interface SectionContentProps {
  section: HelpSection;
}

function SectionContent({ section }: SectionContentProps) {
  return (
    <div className="p-5 animate-content-left">
      {section.content.map((content, index) => (
        <ContentBlock key={index} content={content} />
      ))}
    </div>
  );
}

// Content block renderer
interface ContentBlockProps {
  content: HelpContent;
}

function ContentBlock({ content }: ContentBlockProps) {
  switch (content.type) {
    case "heading":
      return (
        <h3 className="text-body font-medium text-foreground mt-5 mb-2 first:mt-0">
          {content.text}
        </h3>
      );

    case "paragraph":
      return (
        <p className="text-body text-muted-foreground mb-3">{content.text}</p>
      );

    case "list":
      return (
        <ul className="mb-3 space-y-1.5">
          {content.items?.map((item, i) => (
            <li
              key={i}
              className="text-body text-muted-foreground flex items-start gap-2"
            >
              <span className="text-muted-foreground mt-1.5 w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      );

    case "numbered-list":
      return (
        <ol className="mb-3 space-y-1.5">
          {content.items?.map((item, i) => (
            <li
              key={i}
              className="text-body text-muted-foreground flex items-start gap-2"
            >
              <span className="text-muted-foreground flex-shrink-0 w-5">
                {i + 1}.
              </span>
              {item}
            </li>
          ))}
        </ol>
      );

    case "table":
      return (
        <div className="mb-3 rounded-lg border border-border-subtle overflow-hidden">
          <table className="w-full text-body">
            {content.headers && (
              <thead>
                <tr className="bg-muted">
                  {content.headers.map((header, i) => (
                    <th
                      key={i}
                      className="text-left px-3 py-2 text-muted-foreground font-medium"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {content.rows?.map((row, i) => (
                <tr key={i} className="border-t border-border-subtle">
                  {row.cols.map((col, j) => (
                    <td
                      key={j}
                      className={`px-3 py-2 ${
                        j === 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {col}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "note":
      return (
        <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent)]/20">
          <Info size={16} className="flex-shrink-0 text-[var(--accent)] mt-0.5" />
          <p className="text-body text-foreground">{content.text}</p>
        </div>
      );

    default:
      return null;
  }
}
