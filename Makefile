# Makefile for src

RM=rm -f
TSC=tsc

TSFLAGS=--noEmitOnError \
	--noFallthroughCasesInSwitch \
	--noImplicitAny \
	--noImplicitReturns

OUTDIR=.
OUTFILE=$(OUTDIR)/caption.js

all: $(OUTFILE)

clean:
	-$(RM) $(OUTFILE)

$(OUTFILE): caption.ts
	$(TSC) $(TSFLAGS) --out $@ $^
