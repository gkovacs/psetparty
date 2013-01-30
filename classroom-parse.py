#!/usr/bin/env python

buildingnum_to_address = {}

output = {}

for line in open('buildings-orig.txt'):
  buildingnum = line[0:11].strip()
  buildingname = line[11:46].strip()
  buildingaddress = line[46:79].strip()
  buildingnum_to_address[buildingnum] = buildingaddress
  #output['BUILDING ' + buildingnum] = buildingaddress
  #output[buildingname] = buildingaddress

classrooms = []
for line in open('classrooms.txt'):
  for classroom in line.split('|'):
    classrooms.append(classroom.strip())

for classroom in classrooms:
  buildingnum = classroom.split('-')[0]
  address = buildingnum_to_address[buildingnum]
  output[classroom] =  address

def fixCase(x):
  if ' ' in x:
    return ' '.join(fixCase(w) for w in x.split(' '))
  if len(x) == 0:
    return x
  return x[0] + x[1:].lower()

for k,v in sorted(output.items()):
  print fixCase(k) + '\t' + fixCase(v)

