-- Lorewalk Singapore POI seed data
-- Run against your Supabase project via the SQL Editor or CLI.
-- PostGIS note: ST_MakePoint takes (longitude, latitude) — NOT (latitude, longitude).

-- Create table if it doesn't exist yet
create table if not exists permanent_pois (
  id             text primary key,
  name           text not null,
  description    text,
  geom           geography(POINT, 4326) not null,
  category       text,
  points         int default 5,
  learn_more_url text,
  premium_only   boolean default false,
  creature_reward_id text
);

-- Spatial index for ST_DWithin performance
create index if not exists permanent_pois_geom_idx
  on permanent_pois using gist (geom);

-- Upsert all 117 Singapore POIs
insert into permanent_pois (id, name, description, geom, category, points, learn_more_url) values
-- Marina Bay / Downtown Core
('sg-001', 'Merlion Park', 'Home of Singapore''s iconic Merlion statue — a mythical creature with the head of a lion and the body of a fish, symbolising the city-state''s origins as a fishing village.', ST_SetSRID(ST_MakePoint(103.8545, 1.2867), 4326), 'landmark', 10, 'https://en.wikipedia.org/wiki/Merlion'),
('sg-002', 'Marina Bay Sands', 'Iconic integrated resort with a distinctive sky park bridging three towers, opened in 2010 on reclaimed land that was part of Singapore''s urban transformation.', ST_SetSRID(ST_MakePoint(103.8607, 1.2840), 4326), 'landmark', 8, 'https://en.wikipedia.org/wiki/Marina_Bay_Sands'),
('sg-003', 'Gardens by the Bay', 'A 101-hectare nature park featuring the futuristic Supertree Grove, opened in 2012 as part of Singapore''s vision to be a City in a Garden.', ST_SetSRID(ST_MakePoint(103.8636, 1.2816), 4326), 'nature', 9, 'https://en.wikipedia.org/wiki/Gardens_by_the_Bay'),
('sg-004', 'Helix Bridge', 'A pedestrian bridge with a distinctive double-helix structure symbolising life and continuity, connecting Marina Centre to Marina South.', ST_SetSRID(ST_MakePoint(103.8590, 1.2888), 4326), 'landmark', 5, 'https://en.wikipedia.org/wiki/Helix_Bridge'),
('sg-005', 'Esplanade Theatres on the Bay', 'Singapore''s national performing arts centre, nicknamed "the Durian" for its distinctive spiky facade of aluminium sunshades.', ST_SetSRID(ST_MakePoint(103.8557, 1.2893), 4326), 'arts', 7, 'https://en.wikipedia.org/wiki/Esplanade_%E2%80%93_Theatres_on_the_Bay'),
('sg-006', 'Fullerton Hotel', 'Built in 1928 as the General Post Office, this neoclassical landmark was converted into a luxury hotel. It served as Singapore''s central post office for over 70 years.', ST_SetSRID(ST_MakePoint(103.8524, 1.2861), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/The_Fullerton_Hotel_Singapore'),
('sg-007', 'Cavenagh Bridge', 'Built in 1869, Singapore''s oldest surviving bridge and the only suspension bridge in the city. Named after Governor Orfeur Cavenagh.', ST_SetSRID(ST_MakePoint(103.8529, 1.2880), 4326), 'heritage', 6, 'https://en.wikipedia.org/wiki/Cavenagh_Bridge'),
('sg-008', 'Boat Quay', 'A historic quay that was Singapore''s commercial hub during the colonial era. By the 1860s it handled 70% of the colony''s trade.', ST_SetSRID(ST_MakePoint(103.8500, 1.2872), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Boat_Quay'),
('sg-009', 'Anderson Bridge', 'A steel bridge built in 1910 to relieve congestion on the older Cavenagh Bridge, named after Governor John Anderson.', ST_SetSRID(ST_MakePoint(103.8528, 1.2873), 4326), 'heritage', 5, 'https://en.wikipedia.org/wiki/Anderson_Bridge'),
-- Civic District
('sg-010', 'National Gallery Singapore', 'Housed in the restored City Hall and former Supreme Court buildings, this museum holds the world''s largest public collection of modern Southeast Asian art.', ST_SetSRID(ST_MakePoint(103.8519, 1.2905), 4326), 'museum', 9, 'https://en.wikipedia.org/wiki/National_Gallery_Singapore'),
('sg-011', 'Victoria Theatre and Concert Hall', 'Built in 1862 as Singapore''s first Town Hall, this colonial building is one of the oldest performing arts venues in Southeast Asia.', ST_SetSRID(ST_MakePoint(103.8516, 1.2891), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Victoria_Theatre_and_Concert_Hall'),
('sg-012', 'The Arts House', 'The oldest government building in Singapore, built in 1827 as a merchant''s house, later serving as Parliament House from 1954 to 1999.', ST_SetSRID(ST_MakePoint(103.8512, 1.2885), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/The_Arts_House'),
('sg-013', 'The Padang', 'A historic open field at the heart of the Civic District. Site of Singapore''s National Day Parade and many historic colonial-era sporting events.', ST_SetSRID(ST_MakePoint(103.8533, 1.2912), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Padang,_Singapore'),
('sg-014', 'St. Andrew''s Cathedral', 'Built between 1856 and 1861, this is Singapore''s oldest Anglican cathedral. Its white walls were plastered using a technique mixing egg whites and shell lime.', ST_SetSRID(ST_MakePoint(103.8520, 1.2924), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/St._Andrew%27s_Cathedral,_Singapore'),
('sg-015', 'CHIJMES', 'A Victorian Gothic chapel and convent complex built in 1841 by French Catholic missionaries, now a heritage dining and arts venue.', ST_SetSRID(ST_MakePoint(103.8521, 1.2952), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/CHIJMES'),
('sg-016', 'Asian Civilisations Museum', 'Housed in the 1865 Empress Place Building, this museum explores the ancestral cultures of Singaporeans across Asia.', ST_SetSRID(ST_MakePoint(103.8513, 1.2879), 4326), 'museum', 9, 'https://en.wikipedia.org/wiki/Asian_Civilisations_Museum'),
('sg-017', 'Old Hill Street Police Station', 'Built in 1934, this Art Deco building with 927 colourful windows served as police headquarters and later as Singapore''s first civil service building post-independence.', ST_SetSRID(ST_MakePoint(103.8462, 1.2904), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Old_Hill_Street_Police_Station'),
('sg-018', 'Armenian Church of St. Gregory', 'Built in 1835, this is the oldest Christian church in Singapore. The national flower, the Vanda Miss Joaquim orchid, was first cultivated in its garden.', ST_SetSRID(ST_MakePoint(103.8490, 1.2951), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Armenian_Church_of_Saint_Gregory_the_Illuminator,_Singapore'),
('sg-019', 'Raffles Hotel', 'Opened in 1887, this legendary colonial hotel is where the Singapore Sling cocktail was invented. Named after Singapore''s founder Sir Stamford Raffles.', ST_SetSRID(ST_MakePoint(103.8529, 1.2946), 4326), 'heritage', 9, 'https://en.wikipedia.org/wiki/Raffles_Hotel'),
('sg-020', 'Clarke Quay', 'A historic riverside quay named after Singapore''s second Colonial Secretary, Sir Andrew Clarke. The restored Victorian warehouses now house restaurants and bars.', ST_SetSRID(ST_MakePoint(103.8463, 1.2898), 4326), 'heritage', 6, 'https://en.wikipedia.org/wiki/Clarke_Quay'),
-- Museums & Arts
('sg-021', 'Peranakan Museum', 'Housed in the 1912 Tao Nan School building, this museum celebrates the rich culture of the Peranakan community — descendants of early Chinese immigrants who intermarried with local Malays.', ST_SetSRID(ST_MakePoint(103.8490, 1.2970), 4326), 'museum', 9, 'https://en.wikipedia.org/wiki/Peranakan_Museum'),
('sg-022', 'Singapore Art Museum', 'Established in the restored 1855 St. Joseph''s Institution building, Singapore''s first art museum focuses on contemporary Southeast Asian art.', ST_SetSRID(ST_MakePoint(103.8487, 1.2972), 4326), 'museum', 8, 'https://en.wikipedia.org/wiki/Singapore_Art_Museum'),
('sg-023', 'National Museum of Singapore', 'Singapore''s oldest museum, founded in 1887 as the Raffles Library and Museum. The building''s glass rotunda is a Singapore heritage icon.', ST_SetSRID(ST_MakePoint(103.8481, 1.2966), 4326), 'museum', 9, 'https://en.wikipedia.org/wiki/National_Museum_of_Singapore'),
('sg-024', 'Fort Canning Park', 'Hill that served as the seat of ancient Malay kings, then British military headquarters. The Battlebox bunker here was where Malaya''s surrender was decided in 1942.', ST_SetSRID(ST_MakePoint(103.8445, 1.2960), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Fort_Canning'),
('sg-025', 'Bras Basah Complex', 'A 1980 shopping complex that became Singapore''s hub for books, art supplies, and educational materials. Its name derives from the Malay for "wet rice".', ST_SetSRID(ST_MakePoint(103.8517, 1.2957), 4326), 'heritage', 5, 'https://en.wikipedia.org/wiki/Bras_Basah_Complex'),
-- Chinatown
('sg-026', 'Sri Mariamman Temple', 'The oldest Hindu temple in Singapore, built in 1827. Its gopuram (entrance tower) is decorated with hundreds of sculpted Hindu deities.', ST_SetSRID(ST_MakePoint(103.8443, 1.2800), 4326), 'religious', 9, 'https://en.wikipedia.org/wiki/Sri_Mariamman_Temple,_Singapore'),
('sg-027', 'Buddha Tooth Relic Temple', 'Opened in 2007, this Tang Dynasty-style temple claims to house the left canine tooth of the Buddha, retrieved from his funeral pyre.', ST_SetSRID(ST_MakePoint(103.8437, 1.2804), 4326), 'religious', 9, 'https://en.wikipedia.org/wiki/Buddha_Tooth_Relic_Temple_and_Museum'),
('sg-028', 'Chinatown Heritage Centre', 'Housed in three restored shophouses on Pagoda Street, this museum recreates the living conditions of early Chinese immigrants in the 1900s.', ST_SetSRID(ST_MakePoint(103.8439, 1.2818), 4326), 'museum', 8, 'https://en.wikipedia.org/wiki/Chinatown_Heritage_Centre'),
('sg-029', 'Thian Hock Keng Temple', 'Built between 1839 and 1842, this is one of the oldest and most important Hokkien temples in Singapore, dedicated to Mazu, goddess of the sea.', ST_SetSRID(ST_MakePoint(103.8488, 1.2798), 4326), 'religious', 9, 'https://en.wikipedia.org/wiki/Thian_Hock_Keng'),
('sg-030', 'Nagore Dargah', 'A 19th-century mosque in the Telok Ayer historic district, built by Muslim immigrants from Nagore in southern India. Combines Indian and European architectural elements.', ST_SetSRID(ST_MakePoint(103.8483, 1.2797), 4326), 'religious', 7, 'https://en.wikipedia.org/wiki/Nagore_Dargah,_Singapore'),
('sg-031', 'Telok Ayer Market (Lau Pa Sat)', 'A Victorian cast-iron market pavilion built in 1894. "Lau Pa Sat" means "old market" in Hokkien. A national monument and beloved hawker centre.', ST_SetSRID(ST_MakePoint(103.8504, 1.2806), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Lau_Pa_Sat'),
('sg-032', 'Ann Siang Hill', 'A conservation area of early 20th-century shophouses, once home to wealthy Peranakan merchants and clan associations.', ST_SetSRID(ST_MakePoint(103.8459, 1.2801), 4326), 'heritage', 6, 'https://en.wikipedia.org/wiki/Ann_Siang_Hill'),
('sg-033', 'Duxton Hill', 'A row of preserved shophouses from the 1860s–1920s, among the earliest surviving in Singapore. Features a mix of Chinese, Malay, and European architectural styles.', ST_SetSRID(ST_MakePoint(103.8421, 1.2774), 4326), 'heritage', 6, 'https://en.wikipedia.org/wiki/Duxton_Plain_Park'),
('sg-034', 'Keong Saik Road', 'A heritage street of two-storey shophouses from the 1920s, named after a Cantonese merchant. Once part of Singapore''s red-light district, now a conservation area.', ST_SetSRID(ST_MakePoint(103.8406, 1.2796), 4326), 'heritage', 6, 'https://www.roots.gov.sg/places/places-landing/Places/surveyed-areas/keong-saik-road'),
('sg-035', 'Tanjong Pagar Railway Station', 'Built in 1932 in Art Deco style, this was the Singapore terminus of the Malaysian rail network (KTM). Closed in 2011 when the tracks were returned to Singapore.', ST_SetSRID(ST_MakePoint(103.8409, 1.2751), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Tanjong_Pagar_railway_station'),
-- Kampong Glam
('sg-036', 'Sultan Mosque', 'Completed in 1932, the golden-domed Sultan Mosque is the most important mosque in Singapore. The original was built in 1824 as part of an agreement with the Sultan of Johor.', ST_SetSRID(ST_MakePoint(103.8591, 1.3021), 4326), 'religious', 9, 'https://en.wikipedia.org/wiki/Sultan_Mosque,_Singapore'),
('sg-037', 'Malay Heritage Centre', 'Situated in the former Istana Kampong Glam, the palace of the Malay royalty. The museum chronicles the history and culture of Singapore''s Malay community.', ST_SetSRID(ST_MakePoint(103.8594, 1.3023), 4326), 'museum', 8, 'https://en.wikipedia.org/wiki/Malay_Heritage_Centre'),
('sg-038', 'Haji Lane', 'A narrow street in the Kampong Glam conservation district, famous for colourful shophouse facades, independent boutiques, and street art.', ST_SetSRID(ST_MakePoint(103.8607, 1.3022), 4326), 'heritage', 6, 'https://en.wikipedia.org/wiki/Haji_Lane'),
('sg-039', 'Arab Street', 'Heart of Singapore''s Malay-Arab quarter. Historically a trading area for textiles, batik, and rattan, established since the early 19th century.', ST_SetSRID(ST_MakePoint(103.8614, 1.3023), 4326), 'heritage', 6, 'https://en.wikipedia.org/wiki/Arab_Street,_Singapore'),
('sg-040', 'Hajjah Fatimah Mosque', 'Built in 1846 and named after a wealthy Malay-Buginese merchant. The minaret leans at a 6-degree angle — Singapore''s answer to the Leaning Tower of Pisa.', ST_SetSRID(ST_MakePoint(103.8625, 1.3054), 4326), 'religious', 7, 'https://en.wikipedia.org/wiki/Hajjah_Fatimah_Mosque'),
-- Little India
('sg-041', 'Sri Veeramakaliamman Temple', 'Built by Bengali labourers in 1881, this temple is dedicated to Kali, the fierce Hindu goddess. The gopuram towers are elaborately decorated with colourful deities.', ST_SetSRID(ST_MakePoint(103.8519, 1.3068), 4326), 'religious', 9, 'https://en.wikipedia.org/wiki/Sri_Veeramakaliamman_Temple'),
('sg-042', 'Sri Srinivasa Perumal Temple', 'A Tamil Hindu temple dedicated to Vishnu, built in 1855. Its 48-metre gopuram was added in 1979 and is the starting point of the annual Thaipusam procession.', ST_SetSRID(ST_MakePoint(103.8519, 1.3103), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Sri_Srinivasa_Perumal_Temple'),
('sg-043', 'Sakya Muni Buddha Gaya Temple', 'Known as the Temple of 1,000 Lights, this 1927 Thai Buddhist temple features a 15-metre seated Buddha image surrounded by 1,000 electric lights.', ST_SetSRID(ST_MakePoint(103.8533, 1.3116), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Temple_of_1000_Lights'),
('sg-044', 'Indian Heritage Centre', 'Opened in 2015, this museum explores the origins and contributions of Indian communities in Singapore and the region over 700 years of history.', ST_SetSRID(ST_MakePoint(103.8508, 1.3069), 4326), 'museum', 8, 'https://en.wikipedia.org/wiki/Indian_Heritage_Centre'),
('sg-045', 'Tekka Centre', 'A wet market and hawker centre in the heart of Little India. Originally built on marshland drained in the 1820s, known for fresh produce and authentic Indian food.', ST_SetSRID(ST_MakePoint(103.8496, 1.3074), 4326), 'heritage', 6, 'https://www.roots.gov.sg/places/places-landing/Places/surveyed-areas/the-tekka-market'),
('sg-046', 'Sri Thendayuthapani Temple', 'Also known as Chettiar''s Temple, built by Indian Chettiars in 1859. The Thaipusam procession ends here. Rebuilt in its current form in 1984.', ST_SetSRID(ST_MakePoint(103.8379, 1.2971), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Sri_Thendayuthapani_Temple'),
-- Orchard / Tanglin
('sg-047', 'The Istana', 'The official residence of the President of Singapore, built in 1869 as the Government House. The grounds are opened to the public on select public holidays.', ST_SetSRID(ST_MakePoint(103.8321, 1.3059), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Istana,_Singapore'),
('sg-048', 'Emerald Hill Conservation Area', 'A quiet street of Peranakan terrace houses built between 1901 and 1925. Originally a nutmeg plantation, later subdivided for wealthy Peranakan families.', ST_SetSRID(ST_MakePoint(103.8333, 1.3037), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Emerald_Hill_Road'),
('sg-049', 'Singapore Botanic Gardens', 'A UNESCO World Heritage Site since 2015. Founded in 1859, these are one of the world''s great tropical gardens. The rubber tree industry was pioneered here.', ST_SetSRID(ST_MakePoint(103.8159, 1.3138), 4326), 'nature', 9, 'https://en.wikipedia.org/wiki/Singapore_Botanic_Gardens'),
('sg-050', 'Dempsey Hill', 'Former British military barracks (Tanglin Barracks) built in the 1860s. After independence, repurposed as an arts and dining enclave within a lush forested setting.', ST_SetSRID(ST_MakePoint(103.8097, 1.3053), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Dempsey_Hill'),
-- Southern & West
('sg-051', 'Haw Par Villa', 'A mythological theme park built in 1937 by Tiger Balm founders Aw Boon Haw and Aw Boon Par. Its 1,000 statues depicting Chinese mythology are a uniquely surreal Singapore landmark.', ST_SetSRID(ST_MakePoint(103.7791, 1.3007), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Haw_Par_Villa'),
('sg-052', 'Reflections at Bukit Chandu', 'A World War II museum commemorating the Battle of Pasir Panjang, where the Malay Regiment made a last stand against Japanese forces in February 1942.', ST_SetSRID(ST_MakePoint(103.7840, 1.3011), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Reflections_at_Bukit_Chandu'),
('sg-053', 'Labrador Nature Reserve', 'The only rocky sea cliffs on mainland Singapore, with WW2-era gun batteries and bunkers. One of Singapore''s oldest nature reserves.', ST_SetSRID(ST_MakePoint(103.8030, 1.2606), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Labrador_Nature_Reserve'),
('sg-054', 'Southern Ridges (Henderson Waves)', 'A 10km trail connecting Mount Faber, Telok Blangah Hill and Kent Ridge. Henderson Waves is Singapore''s highest pedestrian bridge at 36 metres.', ST_SetSRID(ST_MakePoint(103.8074, 1.2752), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Henderson_Waves'),
('sg-055', 'Gillman Barracks', 'Former British military barracks built in 1936, now an arts cluster housing international contemporary art galleries. A national monument since 1998.', ST_SetSRID(ST_MakePoint(103.8085, 1.2749), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Gillman_Barracks'),
('sg-056', 'Lee Kong Chian Natural History Museum', 'Opened in 2015 at NUS, this museum houses three of only ten Diplodocus fossils in the world and specimens collected by Alfred Russel Wallace during his time in Singapore.', ST_SetSRID(ST_MakePoint(103.7824, 1.2994), 4326), 'museum', 8, 'https://en.wikipedia.org/wiki/Lee_Kong_Chian_Natural_History_Museum'),
('sg-057', 'Queenstown Estate', 'Singapore''s first satellite public housing estate, built by the HDB from 1958. A milestone in Singapore''s massive post-independence public housing programme.', ST_SetSRID(ST_MakePoint(103.8053, 1.2950), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Queenstown,_Singapore'),
('sg-058', 'Old Ford Motor Factory', 'Built in 1941 as Ford''s first car assembly plant in Southeast Asia. On 15 February 1942, British Lieutenant-General Percival surrendered to the Japanese here.', ST_SetSRID(ST_MakePoint(103.7712, 1.3429), 4326), 'heritage', 9, 'https://en.wikipedia.org/wiki/Old_Ford_Motor_Factory'),
('sg-059', 'Jurong Lake Gardens', 'Singapore''s first national gardens in the heartlands, opened in 2019. Built around Jurong Lake, the site includes the historic Chinese Garden and Japanese Garden.', ST_SetSRID(ST_MakePoint(103.7312, 1.3432), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Jurong_Lake_Gardens'),
-- Sentosa
('sg-060', 'Fort Siloso', 'The only preserved coastal fort in Singapore, guarding the western entrance of Keppel Harbour. During WW2 its guns faced seaward when the Japanese attacked from the north.', ST_SetSRID(ST_MakePoint(103.8174, 1.2507), 4326), 'heritage', 9, 'https://en.wikipedia.org/wiki/Fort_Siloso'),
('sg-061', 'Palawan Beach Southernmost Point', 'A small islet connected to Sentosa by a suspension bridge, marking the southernmost point of continental Asia.', ST_SetSRID(ST_MakePoint(103.8207, 1.2497), 4326), 'landmark', 8, 'https://en.wikipedia.org/wiki/Sentosa'),
-- East Coast
('sg-062', 'Geylang Serai', 'Heart of the Malay community in Singapore''s east. Named after the lemongrass (serai) plantations once cultivated here.', ST_SetSRID(ST_MakePoint(103.8965, 1.3199), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Geylang_Serai'),
('sg-063', 'Joo Chiat Conservation Area', 'Singapore''s first heritage town, noted for its Peranakan shophouses and Eurasian community. Preserves one of the best concentrations of pre-war architecture.', ST_SetSRID(ST_MakePoint(103.9001, 1.3147), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Joo_Chiat'),
('sg-064', 'Katong Antique House', 'A private museum on East Coast Road housing an extensive collection of Peranakan (Straits Chinese) antiques, costumes, and cultural artefacts.', ST_SetSRID(ST_MakePoint(103.8987, 1.3069), 4326), 'museum', 7, 'https://www.roots.gov.sg/places/places-landing/Places/surveyed-areas/east-coast-road-katong'),
('sg-065', 'Changi Chapel and Museum', 'A replica of the chapel built by Allied POWs interned at Changi Prison during the Japanese Occupation (1942–1945). The museum tells the story of 87,000 POWs held here.', ST_SetSRID(ST_MakePoint(103.9897, 1.3829), 4326), 'heritage', 9, 'https://en.wikipedia.org/wiki/Changi_Museum'),
('sg-066', 'Old Changi Hospital', 'Built in 1935 as the RAF Changi station hospital, later used by the Japanese during WWII and as a hospital annex until 1997. One of Singapore''s most storied abandoned sites.', ST_SetSRID(ST_MakePoint(103.9911, 1.3867), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Old_Changi_Hospital'),
('sg-067', 'Changi Beach Park', 'Site of the Sook Ching massacre in 1942, where thousands of Chinese civilians were executed by Japanese forces. A sombre memorial stands at the beach.', ST_SetSRID(ST_MakePoint(103.9882, 1.3892), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Changi_Beach_Park'),
-- North
('sg-068', 'Kranji War Memorial', 'The principal memorial and cemetery for Allied soldiers who died during the Battle of Singapore and the Japanese Occupation. Over 4,000 are buried here.', ST_SetSRID(ST_MakePoint(103.7602, 1.4268), 4326), 'heritage', 9, 'https://en.wikipedia.org/wiki/Kranji_War_Memorial'),
('sg-069', 'Sungei Buloh Wetland Reserve', 'Singapore''s first ASEAN Heritage Park. A vital stopover for migratory birds on the East Asian Flyway, featuring mangrove swamps and estuarine wetlands.', ST_SetSRID(ST_MakePoint(103.7276, 1.4456), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/Sungei_Buloh_Wetland_Reserve'),
('sg-070', 'Sembawang Hot Spring Park', 'Singapore''s only natural hot spring, used by British servicemen stationed at the nearby Sembawang naval base.', ST_SetSRID(ST_MakePoint(103.8168, 1.4479), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Sembawang_Hot_Spring_Park'),
('sg-071', 'Sun Yat Sen Nanyang Memorial Hall', 'A colonial bungalow that served as the base of operations for Dr. Sun Yat-sen during his visits to Singapore, where he raised funds for the Chinese revolution of 1911.', ST_SetSRID(ST_MakePoint(103.8508, 1.3272), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Sun_Yat_Sen_Nanyang_Memorial_Hall'),
('sg-072', 'Bukit Timah Nature Reserve', 'One of Singapore''s two primary rainforest areas, on the slopes of Bukit Timah Hill (163m — Singapore''s highest point). Contains more tree species than all of North America.', ST_SetSRID(ST_MakePoint(103.7762, 1.3514), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/Bukit_Timah_Nature_Reserve'),
('sg-073', 'Singapore Zoo', 'Opened in 1973, the Singapore Zoo pioneered the open-concept zoo without cages. Set within a peninsular rainforest by the Upper Seletar Reservoir.', ST_SetSRID(ST_MakePoint(103.7930, 1.4043), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/Singapore_Zoo'),
('sg-074', 'Night Safari', 'The world''s first nocturnal zoo, opened in 1994 adjacent to the Singapore Zoo. Showcases over 900 animals in a naturalistic rainforest setting after dark.', ST_SetSRID(ST_MakePoint(103.7893, 1.4049), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/Night_Safari'),
('sg-075', 'Bird Paradise', 'Southeast Asia''s largest bird park, relocated from Jurong to Mandai Wildlife Reserve in 2023. Houses over 3,500 birds across 400 species in walk-through aviaries.', ST_SetSRID(ST_MakePoint(103.7768, 1.4406), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/Jurong_Bird_Park'),
('sg-076', 'Woodlands Waterfront', 'A promenade along the Straits of Johor offering views of Johor Bahru across the water. Near the site where the causeway connecting Singapore to Malaysia was built in 1923.', ST_SetSRID(ST_MakePoint(103.7877, 1.4550), 4326), 'landmark', 6, 'https://en.wikipedia.org/wiki/Woodlands,_Singapore'),
-- Central / MacRitchie
('sg-077', 'MacRitchie Reservoir Park', 'Singapore''s oldest reservoir, built in 1868. The HSBC TreeTop Walk, a 250-metre suspension bridge at 25m height, offers rainforest canopy views.', ST_SetSRID(ST_MakePoint(103.8234, 1.3508), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/MacRitchie_Reservoir'),
('sg-078', 'Bishan-Ang Mo Kio Park', 'Singapore''s largest urban park, famous for its naturalised river — a concrete canal converted into a biodiverse meandering stream in 2012.', ST_SetSRID(ST_MakePoint(103.8404, 1.3616), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Bishan%E2%80%93Ang_Mo_Kio_Park'),
('sg-079', 'Toa Payoh Town Centre', 'Singapore''s second public housing new town, developed in the 1960s–70s. Toa Payoh''s dragon playground, built in 1979, is one of Singapore''s most iconic heritage playgrounds.', ST_SetSRID(ST_MakePoint(103.8484, 1.3329), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Toa_Payoh'),
-- North-East
('sg-080', 'Punggol Waterway Park', 'A 4.2km man-made waterway through Punggol''s eco-town. The area was once a Malay fishing village and kampung before being redeveloped.', ST_SetSRID(ST_MakePoint(103.9034, 1.4037), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Punggol'),
('sg-081', 'Coney Island Park', 'A 50-hectare offshore island nature park. Once a private leisure retreat known as "Ponggol Point", it retains pockets of secondary forest and coastal scrub.', ST_SetSRID(ST_MakePoint(103.9137, 1.4024), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/Coney_Island,_Singapore'),
('sg-082', 'Pasir Ris Park', 'A 69.7-hectare coastal park in Singapore''s east, featuring one of the best-preserved mangrove areas in Singapore.', ST_SetSRID(ST_MakePoint(103.9519, 1.3814), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Pasir_Ris_Park'),
-- Pulau Ubin
('sg-083', 'Pulau Ubin', 'An offshore island that preserves Singapore as it was in the 1960s. A kampung (village) lifestyle still survives here, making it a living time capsule of old Singapore.', ST_SetSRID(ST_MakePoint(103.9604, 1.4066), 4326), 'heritage', 10, 'https://en.wikipedia.org/wiki/Pulau_Ubin'),
('sg-084', 'Chek Jawa Wetlands', 'A 100-hectare wetlands on Pulau Ubin, one of Singapore''s last natural coastal ecosystems. A public campaign in 2001 saved it from land reclamation.', ST_SetSRID(ST_MakePoint(103.9879, 1.4058), 4326), 'nature', 9, 'https://en.wikipedia.org/wiki/Chek_Jawa'),
-- Additional Landmarks
('sg-085', 'Civilian War Memorial', 'Four tapering columns representing the Chinese, Malay, Indian, and Eurasian communities who died during the Japanese Occupation. Nicknamed "the chopsticks" by locals.', ST_SetSRID(ST_MakePoint(103.8535, 1.2913), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Civilian_War_Memorial,_Singapore'),
('sg-086', 'Lim Bo Seng Memorial', 'A memorial to Major Lim Bo Seng, a Chinese resistance fighter executed by the Japanese in 1944. A rare memorial to a civilian resistance hero in Singapore.', ST_SetSRID(ST_MakePoint(103.8550, 1.2925), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Lim_Bo_Seng'),
('sg-087', 'Raffles'' Landing Site', 'The site where Sir Stamford Raffles is said to have first landed on Singapore on 28 January 1819. A white polymarble statue marks the spot.', ST_SetSRID(ST_MakePoint(103.8500, 1.2897), 4326), 'heritage', 9, 'https://en.wikipedia.org/wiki/Stamford_Raffles'),
('sg-088', 'Parliament House', 'Singapore''s current Parliament House, built in 1999. Features a bronze elephant gifted by King Chulalongkorn of Siam in 1871 in its grounds.', ST_SetSRID(ST_MakePoint(103.8508, 1.2890), 4326), 'heritage', 7, 'https://en.wikipedia.org/wiki/Parliament_House,_Singapore'),
('sg-089', 'Marina Barrage', 'A dam built across Marina Channel in 2008, creating Singapore''s 15th and first city reservoir. The rooftop park is a popular spot for kite-flying and picnics.', ST_SetSRID(ST_MakePoint(103.8714, 1.2803), 4326), 'landmark', 7, 'https://en.wikipedia.org/wiki/Marina_Barrage'),
('sg-090', 'Telok Blangah Hill Park', 'A hilltop park in the Southern Ridges offering panoramic views of the port and southern islands. The hill was once a haven for Malay nobles fleeing conflict.', ST_SetSRID(ST_MakePoint(103.8135, 1.2757), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Telok_Blangah_Hill_Park'),
('sg-091', 'Masjid Al-Abrar', 'One of Singapore''s oldest mosques, built around 1827 by early Tamil Muslim immigrants. Originally known as "Kuchu Palli" (small mosque) due to its modest size.', ST_SetSRID(ST_MakePoint(103.8492, 1.2801), 4326), 'religious', 7, 'https://en.wikipedia.org/wiki/Masjid_Al-Abrar'),
('sg-092', 'Robertson Quay', 'The furthest point inland for bumboats on the Singapore River. Named after city surveyor J.T. Robertson. Warehouses here once stored goods like pepper and rubber.', ST_SetSRID(ST_MakePoint(103.8383, 1.2899), 4326), 'heritage', 6, 'https://en.wikipedia.org/wiki/Robertson_Quay'),
('sg-093', 'Tiong Bahru Estate', 'Singapore''s first public housing estate, built by the Singapore Improvement Trust in the 1930s–40s. The streamline moderne and Art Deco architecture is a conservation landmark.', ST_SetSRID(ST_MakePoint(103.8283, 1.2843), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Tiong_Bahru'),
('sg-094', 'National Orchid Garden', 'Within Singapore Botanic Gardens, this garden showcases over 1,000 species and 2,000 hybrids of orchids. Singapore''s national flower, the Vanda Miss Joaquim, was cultivated here.', ST_SetSRID(ST_MakePoint(103.8154, 1.3143), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/National_Orchid_Garden,_Singapore'),
('sg-095', 'Ang Mo Kio Town Garden West', 'A community garden in Singapore''s first self-sufficient new town, developed in the 1970s. Ang Mo Kio ("Tomato Bridge" in Hokkien) was named after a bridge over a stream.', ST_SetSRID(ST_MakePoint(103.8474, 1.3665), 4326), 'nature', 5, 'https://en.wikipedia.org/wiki/Ang_Mo_Kio'),
('sg-096', 'Battlebox, Fort Canning', 'An underground military command centre built in 1939 beneath Fort Canning Hill. The decision to surrender Singapore to Japan on 15 February 1942 was made in this bunker.', ST_SetSRID(ST_MakePoint(103.8445, 1.2963), 4326), 'heritage', 9, 'https://en.wikipedia.org/wiki/Battlebox'),
('sg-097', 'Keramat Iskandar Shah', 'A shrine at the summit of Fort Canning Hill, said to be the tomb of Iskandar Shah — the last ruler of the ancient Kingdom of Singapura — who fled to Malacca around 1398.', ST_SetSRID(ST_MakePoint(103.8449, 1.2966), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Fort_Canning'),
('sg-098', 'Kwan Im Thong Hood Cho Temple', 'One of Singapore''s most popular Taoist temples, dedicated to Guan Yin, Goddess of Mercy. Built in 1884, it draws thousands of devotees daily seeking guidance via fortune sticks.', ST_SetSRID(ST_MakePoint(103.8512, 1.3014), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Kwan_Im_Thong_Hood_Cho_Temple'),
('sg-099', 'Sri Krishnan Temple', 'A Hindu temple built in 1870 on Waterloo Street, notable for its unusual neighbour: the Kwan Im Temple next door. Many Chinese devotees visit both temples.', ST_SetSRID(ST_MakePoint(103.8508, 1.3014), 4326), 'religious', 7, 'https://en.wikipedia.org/wiki/Sri_Krishnan_Temple,_Singapore'),
('sg-100', 'Esplanade Park', 'A historic waterfront park at the mouth of the Singapore River. Contains memorials to Lim Bo Seng and Tan Kim Seng, who funded Singapore''s first municipal waterworks.', ST_SetSRID(ST_MakePoint(103.8541, 1.2900), 4326), 'heritage', 6, 'https://en.wikipedia.org/wiki/Esplanade_Park,_Singapore'),
-- Marine Parade / East Coast
('sg-101', 'East Coast Park', 'Singapore''s most popular coastal park, stretching 15 km along the shoreline on land reclaimed from the sea beginning in 1966. The park replaced the fishing villages and coconut plantations that once lined this coast.', ST_SetSRID(ST_MakePoint(103.9264, 1.3040), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/East_Coast_Park,_Singapore'),
('sg-102', 'Sri Senpaga Vinayagar Temple', 'One of Singapore''s most architecturally striking temples, founded in the 1850s by Sri Lankan Tamil immigrants. Dedicated to Ganesha (Vinayagar), it is named after the champak flower tree (senpagam) that once stood at the Ceylon Road site.', ST_SetSRID(ST_MakePoint(103.9024, 1.3056), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Sri_Senpaga_Vinayagar_Temple'),
-- Bedok
('sg-103', 'Bedok Reservoir Park', 'The reservoir was created in 1986 by flooding a former granite quarry worked since the 1930s; the quarry walls are still visible beneath the surface. Today it is a hub for wakeboarding, kayaking, and trail running in Singapore''s east.', ST_SetSRID(ST_MakePoint(103.9250, 1.3422), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Bedok_Reservoir'),
('sg-104', 'Palelai Buddhist Temple', 'A Theravada Buddhist temple founded in 1970, consecrated in 1973 by a delegation from Wat Phra Jetuphon (Wat Po) in Bangkok. Named after the Palelai forest where the Buddha meditated, it is one of the few Thai-tradition temples in eastern Singapore.', ST_SetSRID(ST_MakePoint(103.9464, 1.3312), 4326), 'religious', 7, 'https://en.wikipedia.org/wiki/Palelai_Buddhist_Temple'),
-- Tampines
('sg-105', 'Tampines Chinese Temple Complex', 'A complex housing twelve constituent temples, some tracing their origins to the 19th century when Tampines was a village of gambier, pepper, and rubber cultivators. The complex is the anchor of Tampines'' Chinese religious heritage trail.', ST_SetSRID(ST_MakePoint(103.9496, 1.3558), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Tampines'),
('sg-106', 'Masjid Darul Ghufran', 'A mosque serving Tampines''s Muslim community, notable for its striking geometric contemporary architecture. It reflects the planned multicultural character of Tampines as a new town developed from the late 1970s under the HDB decentralisation programme.', ST_SetSRID(ST_MakePoint(103.9398, 1.3554), 4326), 'religious', 7, 'https://en.wikipedia.org/wiki/Masjid_Darul_Ghufran'),
('sg-107', 'Lorong Halus Wetland', 'A 234-hectare wetland park on the eastern bank of Serangoon Reservoir, transformed from a former landfill that operated from 1970 to 2001. The restoration, completed in 2010, is one of Singapore''s largest ecological rehabilitation projects.', ST_SetSRID(ST_MakePoint(103.9229, 1.3955), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/Lorong_Halus'),
-- Hougang / Sengkang
('sg-108', 'Tou Mu Kung Temple', 'Singapore''s oldest surviving temple for the Nine Emperor Gods, established in 1902 in Lim Loh Village and rebuilt in 1921. The annual Nine Emperor Gods Festival held here during the ninth lunar month draws tens of thousands of devotees to Hougang.', ST_SetSRID(ST_MakePoint(103.8788, 1.3551), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Nine_Emperor_Gods_Festival'),
('sg-109', 'Church of the Nativity of the Blessed Virgin Mary', 'A National Monument with records of the first baptism dating to 1853. The current Gothic-style church was completed in 1901 at the junction of Upper Serangoon and Punggol Roads, serving the Catholic communities of Singapore''s northeastern villages.', ST_SetSRID(ST_MakePoint(103.8863, 1.3654), 4326), 'religious', 8, 'https://en.wikipedia.org/wiki/Church_of_the_Nativity_of_the_Blessed_Virgin_Mary,_Singapore'),
('sg-110', 'Serangoon Reservoir', 'Completed in 2011 when the lower Serangoon River was dammed as part of the Punggol–Serangoon reservoir scheme. Together with Punggol Reservoir, these were Singapore''s first reservoirs built within a public housing estate.', ST_SetSRID(ST_MakePoint(103.9300, 1.4006), 4326), 'nature', 6, 'https://en.wikipedia.org/wiki/Serangoon_Reservoir'),
-- Central / Thomson
('sg-111', 'Lower Pierce Reservoir', 'Completed in 1912 as part of Singapore''s water supply expansion, Lower Pierce Reservoir is ringed by protected secondary rainforest forming part of the Central Catchment Nature Reserve corridor. Its boardwalk trails are among the island''s best birdwatching spots.', ST_SetSRID(ST_MakePoint(103.8233, 1.3694), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Pierce_Reservoir'),
-- Sembawang / Yishun
('sg-112', 'Former Admiralty House', 'Built in 1939–1940 as the residence for the Commander of the Royal Navy''s China Station, this two-storey colonial manor was gazetted as a National Monument in 2002. It is one of the best-preserved examples of British naval colonial architecture in Singapore.', ST_SetSRID(ST_MakePoint(103.8223, 1.4475), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Former_Admiralty_House'),
('sg-113', 'Upper Seletar Reservoir', 'Completed in 1940 as part of Singapore''s pre-war water supply expansion, the Upper Seletar Reservoir sits within the Central Catchment Area. It continued to supply water through the Japanese Occupation and remains a serene nature corridor adjacent to the Mandai wildlife zone.', ST_SetSRID(ST_MakePoint(103.8039, 1.4011), 4326), 'nature', 7, 'https://en.wikipedia.org/wiki/Seletar_Reservoir'),
-- West
('sg-114', 'Bukit Batok Nature Park', 'The park contains the overgrown remnants of the Syonan Jinja, a Shinto shrine erected by British POWs in 1942 to honour fallen Japanese soldiers. Demolished after liberation in 1945, only the stone staircase and foundations remain, half-hidden in secondary forest.', ST_SetSRID(ST_MakePoint(103.7648, 1.3508), 4326), 'nature', 8, 'https://en.wikipedia.org/wiki/Bukit_Batok_Nature_Park'),
('sg-115', 'Science Centre Singapore', 'Opened in 1977 adjacent to Jurong Lake, this was one of Southeast Asia''s first dedicated science museums. Established as part of Singapore''s drive to build a science-literate workforce during the 1970s industrial transformation.', ST_SetSRID(ST_MakePoint(103.7356, 1.3332), 4326), 'museum', 6, 'https://en.wikipedia.org/wiki/Science_Centre_Singapore'),
('sg-116', 'Nanyang University Arch', 'The entrance arch of Nanyang University (Nantah, 1956–1980), Singapore''s only Chinese-medium university, built on land donated by rubber magnate Tan Lark Sye and funded by the Hokkien community. The arch was preserved on the NTU campus after the university''s merger into NUS.', ST_SetSRID(ST_MakePoint(103.6800, 1.3458), 4326), 'heritage', 8, 'https://en.wikipedia.org/wiki/Nanyang_University'),
('sg-117', 'West Coast Park', 'A 50-hectare coastal park on reclaimed land along Singapore''s southwestern shore, overlooking the western shipping lanes and PSA container terminals. Occupies land adjacent to the former West Coast British military area.', ST_SetSRID(ST_MakePoint(103.7670, 1.2910), 4326), 'nature', 6, 'https://en.wikipedia.org/wiki/West_Coast_Park,_Singapore')
on conflict (id) do update set
  name           = excluded.name,
  description    = excluded.description,
  geom           = excluded.geom,
  category       = excluded.category,
  points         = excluded.points,
  learn_more_url = excluded.learn_more_url;

-- ─── RPC function for proximity queries ─────────────────────────────────────
-- Returns a unified JSON array of nearby POIs usable by both Unity and the PWA.
-- Note: ST_DWithin on geography columns uses metres directly.

create or replace function get_pois_near(p_lat float8, p_lon float8, p_radius_m float8)
returns setof json language sql stable as $$
  select json_build_object(
    'id',            id,
    'name',          name,
    'description',   description,
    'lat',           ST_Y(geom::geometry),
    'lon',           ST_X(geom::geometry),
    'kind',          'permanent',
    'category',      category,
    'points',        points,
    'learn_more_url', learn_more_url,
    'premium_only',  premium_only,
    'creature_reward_id', creature_reward_id
  )
  from permanent_pois
  where ST_DWithin(
    geom,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    p_radius_m
  )
  union all
  select json_build_object(
    'id',            id,
    'name',          name,
    'description',   description,
    'lat',           ST_Y(geom::geometry),
    'lon',           ST_X(geom::geometry),
    'kind',          'temporary',
    'points',        bonus_points,
    'active_until',  active_until,
    'creature_reward_id', creature_reward_id
  )
  from temporary_pois
  where ST_DWithin(
    geom,
    ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326)::geography,
    p_radius_m
  )
  and now() between active_from and active_until;
$$;
