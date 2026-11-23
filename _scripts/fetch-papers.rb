#!/usr/bin/env ruby
# Looks up every paper in _data/papers.yml on OpenAlex and writes what /papers/ needs to
# _data/papers_meta.json: title, authors, year, venue, abstract, and the reference list
# (plus the title of each referenced work, so the page can search through references).
#
#   ruby _scripts/fetch-papers.rb            # fetch papers that are new since the last run
#   ruby _scripts/fetch-papers.rb --refresh  # refetch everything
#
# A paper is found by its `doi:` field if it has one, otherwise by its `url` (arXiv abstract
# pages and doi.org links). Run it after adding papers, and commit the JSON alongside the YAML.
require 'json'
require 'net/http'
require 'uri'
require 'yaml'

ROOT = File.expand_path('..', __dir__)
PAPERS = File.join(ROOT, '_data', 'papers.yml')
META = File.join(ROOT, '_data', 'papers_meta.json')
API = 'https://api.openalex.org/works'
BATCH = 50 # referenced works looked up per request

def get(url)
  3.times do |attempt|
    res = Net::HTTP.get_response(URI(url))
    return JSON.parse(res.body) if res.is_a?(Net::HTTPSuccess)
    return nil if res.code == '404'
    sleep(2**attempt)
  end
  abort "OpenAlex request failed: #{url}"
end

def doi_of(paper)
  return paper['doi'] if paper['doi']
  case paper['url'].to_s
  when %r{arxiv\.org/(?:abs|pdf)/([\w.\-/]+?)(?:v\d+)?(?:\.pdf)?$} then "10.48550/arXiv.#{$1}"
  when %r{doi\.org/(.+)$} then $1
  end
end

# OpenAlex stores an abstract as {word => [positions]}.
def abstract_of(index)
  return nil unless index
  words = []
  index.each { |word, positions| positions.each { |at| words[at] = word } }
  words.compact.join(' ')
end

def short(id)
  id.split('/').last
end

papers = YAML.load_file(PAPERS) || []
old = File.exist?(META) && !ARGV.include?('--refresh') ? JSON.parse(File.read(META)) : {}
old_papers = old['papers'] || {}
works = old['works'] || {}
meta = {}

papers.each do |paper|
  id = paper['id']
  doi = doi_of(paper)
  if doi.nil?
    warn "#{id}: no arXiv or DOI link to look up; add a `doi:` field"
    next
  end
  if old_papers[id] && old_papers[id]['doi'] == doi
    meta[id] = old_papers[id]
    next
  end
  select = 'id,title,publication_year,authorships,primary_location,abstract_inverted_index,referenced_works'
  work = get("#{API}/doi:#{URI.encode_www_form_component(doi).gsub('%2F', '/')}?select=#{select}")
  if work.nil?
    warn "#{id}: OpenAlex has no record of #{doi}"
    next
  end
  venue = work.dig('primary_location', 'source', 'display_name')
  venue = 'arXiv' if venue =~ /arxiv/i
  meta[id] = {
    'doi' => doi,
    'openalex' => short(work['id']),
    'title' => work['title'],
    'authors' => work['authorships'].map { |a| a.dig('author', 'display_name') }.compact,
    'year' => work['publication_year'],
    'venue' => venue,
    'abstract' => abstract_of(work['abstract_inverted_index']),
    'refs' => work['referenced_works'].map { |ref| short(ref) },
  }
  puts "#{id}: #{work['title']} (#{meta[id]['refs'].size} references)"
  sleep 0.1
end

cited = meta.values.flat_map { |m| m['refs'] }.uniq
works.select! { |ref, _| cited.include?(ref) }
(cited - works.keys).each_slice(BATCH) do |batch|
  page = get("#{API}?filter=openalex:#{batch.join('|')}&select=id,title&per-page=#{BATCH}")
  page['results'].each { |work| works[short(work['id'])] = work['title'] if work['title'] }
  sleep 0.1
end

# One paper per line, so adding a paper adds a line to the diff.
lines = meta.map { |id, m| "    #{id.to_json}: #{m.to_json}" }
File.write(META, "{\n  \"papers\": {\n#{lines.join(",\n")}\n  },\n  \"works\": #{works.sort.to_h.to_json}\n}\n")
puts "#{meta.size} of #{papers.size} papers, #{works.size} referenced works -> #{META.sub(ROOT + '/', '')}"
