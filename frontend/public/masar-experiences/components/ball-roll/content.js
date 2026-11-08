// Facts paraphrased from official tourism/cultural sources; checked 2026-10-22.
const district={title:'UAE National Cultural Map',url:'https://culturalmap.gov.ae/en/facilities/al-fahidi-historical-neighbourhood'};
const tourism={title:'Visit Dubai · Al Fahidi',url:'https://www.visitdubai.com/places-to-visit/al-fahidi-historical-neighbourhood'};
const culture={title:'Dubai Culture · Google Arts & Culture',url:'https://artsandculture.google.com/story/zAWRZ_j5CQugJw'};
const coffee={title:'Visit Dubai · Old Dubai',url:'https://www.visitdubai.com/en/articles/discover-dubais-old-town'};
export const CHAPTERS=[
  {id:'wind-towers',name:'The wind-tower quarter',short:'Wind towers',place:'Al Fahidi · Dubai',subtitle:'Follow the barjeel silhouettes through the heritage lanes.',color:0xeac179,quizzes:[
    {id:'barjeel',question:'What are the traditional wind towers here called?',options:['Minarets','Barajeel','Watchtowers'],answer:1,explanation:'Barajeel are a defining feature of Al Fahidi’s traditional houses.',source:district},
    {id:'cooling',question:'What did the wind towers help the houses do?',options:['Stay cool through airflow','Store rainwater','Signal boats on the creek'],answer:0,explanation:'Wind towers channel moving air into the house, helping cool its rooms.',source:culture},
    {id:'materials',question:'Which material belongs to Al Fahidi’s traditional buildings?',options:['Tinted glass','Stainless steel','Gypsum'],answer:2,explanation:'Traditional buildings use gypsum alongside materials such as stone, teak and palm wood.',source:tourism}
  ]},
  {id:'courtyard',name:'Stories between the walls',short:'Courtyards',place:'Al Fahidi · Dubai',subtitle:'Small squares, textured walls and a slower side of Dubai.',color:0xeac179,quizzes:[
    {id:'era',question:'Which period of Dubai life does the district reflect?',options:['Only the 2000s','The mid-1800s to the 1970s','Ancient Roman times'],answer:1,explanation:'The neighbourhood reflects Dubai’s traditional life from the mid-nineteenth century through the 1970s.',source:district},
    {id:'lanes',question:'What connects the traditional houses in Al Fahidi?',options:['Alleys, pathways and public squares','Motorway interchanges','Underground shopping tunnels'],answer:0,explanation:'Alleys, pathways and public squares form the fabric of this historic neighbourhood.',source:district},
    {id:'heritage',question:'What kind of destination are you exploring?',options:['A ski resort','A new financial district','A historic heritage neighbourhood'],answer:2,explanation:'Al Fahidi preserves a historic part of Dubai and its traditional architecture.',source:tourism}
  ]},
  {id:'creek-gate',name:'Where the creek tells stories',short:'Creek side',place:'Al Fahidi · Dubai',subtitle:'The heritage trail leads back towards Dubai’s historic waterway.',color:0xeac179,quizzes:[
    {id:'creek',question:'Which waterway lies beside Al Fahidi?',options:['Dubai Creek','The River Nile','The Thames'],answer:0,explanation:'Al Fahidi Historical Neighbourhood stands alongside Dubai Creek.',source:tourism},
    {id:'coffee',question:'Which museum in Al Fahidi explores a drink’s history?',options:['The Tea Museum','The Coffee Museum','The Cocoa Museum'],answer:1,explanation:'The Coffee Museum explores coffee’s history in this heritage district.',source:coffee},
    {id:'city',question:'Which city’s heritage have you been discovering?',options:['Fujairah','Abu Dhabi','Dubai'],answer:2,explanation:'Al Fahidi is part of Old Dubai, on the Bur Dubai side of the city.',source:tourism}
  ]}
];
export const DESTINATION={id:'al-fahidi',name:'Al Fahidi Historical Neighbourhood',emirate:'Dubai',url:tourism.url};
